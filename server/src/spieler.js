// Drei-Personen-Schach – Spielernamen (freiwillig, ohne E-Mail und Passwort)
// Jedes Gerät bekommt eine zufällige Spielerkennung (öffentlich) und einen geheimen Schlüssel (nur auf dem Gerät).
// Gespeichert werden nur: Kennung, Spitzname, ein Hash des Schlüssels und wann der Name angelegt und zuletzt benutzt wurde.
// Mit dem Wiederherstellungscode (Kennung + Schlüssel) zieht man auf ein anderes Gerät um.
// Grundlage für spätere Bestenlisten und Turniere. Wertungsregel (für später): Endet eine Partie durch Matt, gibt es
// einen Sieger, alle anderen haben gleich verloren – kein zweiter Platz. Nur bei einem Ende nach Punkten (Material)
// gibt es eine Rangfolge 1., 2., 3. © 2026 Guido Suchsland

import { badName } from './lobby.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } });

const ABC = 'abcdefghjkmnpqrstuvwxyz23456789';
function randStr(n) { const b = crypto.getRandomValues(new Uint8Array(n)); let s = ''; for (const x of b) s += ABC[x % ABC.length]; return s; }
async function sha(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('dps-spieler:' + s));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
// Spitzname: 3–20 Zeichen, Buchstaben (alle Schriften), Ziffern, Leerzeichen, Punkt, Binde- und Unterstrich
function checkNick(s) {
  const n = String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (n.length < 3) return { error: 'Der Spielername braucht mindestens 3 Zeichen.' };
  if (n.length > 20) return { error: 'Der Spielername darf höchstens 20 Zeichen haben.' };
  if (!/^[\p{L}\p{N} ._'’-]+$/u.test(n)) return { error: 'Erlaubt sind Buchstaben, Ziffern, Leerzeichen, Punkt, Apostroph, Binde- und Unterstrich.' };
  if (badName(n) || /admin|moderator|support|offiziell|official|guido ?suchsland/i.test(n)) return { error: 'Dieser Spielername ist nicht erlaubt.' };
  return { nick: n };
}
const okId = (s) => typeof s === 'string' && /^[a-z0-9]{10}$/.test(s);
const okSecret = (s) => typeof s === 'string' && /^[a-z0-9]{24}$/.test(s);

export class Spieler {
  constructor(state) {
    this.state = state;
    this.sql = state.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS spieler (id TEXT PRIMARY KEY, nick TEXT NOT NULL, nkey TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, created INTEGER, seen INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS wertung (sid TEXT, spiel TEXT, elo REAL, partien INTEGER, siege INTEGER, PRIMARY KEY (sid, spiel))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS berichte (key TEXT, seat TEXT, sid TEXT, spiel TEXT, rang TEXT, t INTEGER, gezaehlt INTEGER DEFAULT 0, PRIMARY KEY (key, seat))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS rekord (sid TEXT, spiel TEXT, stufe TEXT, siege INTEGER, bestzuege INTEGER, PRIMARY KEY (sid, spiel, stufe))`);
    this.rate = new Map();   // IP → [Zeitpunkte] gegen massenhaftes Anlegen
  }
  limited(ip) {
    const now = Date.now(), a = (this.rate.get(ip) || []).filter((t) => now - t < 3600e3);
    a.push(now); this.rate.set(ip, a); return a.length > 10;
  }
  row(id) { const r = [...this.sql.exec('SELECT * FROM spieler WHERE id = ?', id)]; return r[0] || null; }
  async auth(b) {
    if (!okId(b.id) || !okSecret(b.secret)) return null;
    const r = this.row(b.id); if (!r || r.hash !== await sha(b.secret)) return null;
    this.sql.exec('UPDATE spieler SET seen = ? WHERE id = ?', Date.now(), b.id);
    return r;
  }
  taken(nick, exceptId) {
    const r = [...this.sql.exec('SELECT id FROM spieler WHERE nkey = ?', nick.toLowerCase())];
    return r.length > 0 && r[0].id !== exceptId;
  }
  async fetch(req) {
    const url = new URL(req.url), act = url.pathname.split('/')[2] || '';
    const ip = req.headers.get('CF-Connecting-IP') || '';
    if (req.method === 'GET' && act === 'frei') {
      const c = checkNick(url.searchParams.get('nick'));
      return json(c.error ? { frei: false, error: c.error } : { frei: !this.taken(c.nick) });
    }
    if (req.method === 'GET' && act === 'liste') {
      const sp = SPIELE.includes(url.searchParams.get('spiel')) ? url.searchParams.get('spiel') : '3ps';
      const rows = [...this.sql.exec(`SELECT s.nick, w.elo, w.partien, w.siege FROM wertung w JOIN spieler s ON s.id = w.sid WHERE w.spiel = ? AND w.partien > 0 ORDER BY w.elo DESC LIMIT 100`, sp)];
      return json({ spiel: sp, liste: rows.map((r) => ({ nick: r.nick, elo: Math.round(r.elo), partien: r.partien, siege: r.siege, vorlaeufig: r.partien < PROV })) });
    }
    if (req.method === 'GET' && act === 'rekorde') {
      const sp = SPIELE.includes(url.searchParams.get('spiel')) ? url.searchParams.get('spiel') : '3ps';
      const out = {};
      for (const st of STUFEN) {
        const rows = [...this.sql.exec(`SELECT s.nick, r.siege, r.bestzuege FROM rekord r JOIN spieler s ON s.id = r.sid WHERE r.spiel = ? AND r.stufe = ? ORDER BY r.siege DESC, r.bestzuege ASC LIMIT 20`, sp, st)];
        out[st] = rows;
      }
      return json({ spiel: sp, rekorde: out });
    }
    if (req.method !== 'POST') return json({ error: 'not found' }, 404);
    let b = {}; try { b = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }

    if (act === 'neu') {
      if (this.limited(ip)) return json({ error: 'Zu viele neue Spielernamen in kurzer Zeit – bitte später noch einmal.' }, 429);
      const c = checkNick(b.nick); if (c.error) return json(c, 400);
      if (this.taken(c.nick)) return json({ error: 'Diesen Spielernamen gibt es schon.' }, 409);
      let id; do { id = randStr(10); } while (this.row(id));
      const secret = randStr(24), now = Date.now();
      this.sql.exec('INSERT INTO spieler (id, nick, nkey, hash, created, seen) VALUES (?, ?, ?, ?, ?, ?)', id, c.nick, c.nick.toLowerCase(), await sha(secret), now, now);
      return json({ id, secret, nick: c.nick });
    }
    const me = await this.auth(b);
    if (!me) return json({ error: 'Spielerkennung oder Wiederherstellungscode stimmen nicht.' }, 403);
    if (act === 'ich') return json({ id: me.id, nick: me.nick });
    if (act === 'name') {
      const c = checkNick(b.nick); if (c.error) return json(c, 400);
      if (this.taken(c.nick, me.id)) return json({ error: 'Diesen Spielernamen gibt es schon.' }, 409);
      this.sql.exec('UPDATE spieler SET nick = ?, nkey = ? WHERE id = ?', c.nick, c.nick.toLowerCase(), me.id);
      return json({ id: me.id, nick: c.nick });
    }
    if (act === 'neuerschluessel') {   // nach Weitergabe des Codes: alten Code ungültig machen
      const secret = randStr(24);
      this.sql.exec('UPDATE spieler SET hash = ? WHERE id = ?', await sha(secret), me.id);
      return json({ id: me.id, secret, nick: me.nick });
    }
    if (act === 'ergebnis') return json(this.ergebnis(me, b));
    if (act === 'rekord') return json(this.rekord(me, b));
    if (act === 'meine') {
      const w = [...this.sql.exec('SELECT spiel, elo, partien, siege FROM wertung WHERE sid = ?', me.id)].map((r) => ({ ...r, elo: Math.round(r.elo) }));
      return json({ nick: me.nick, wertung: w });
    }
    if (act === 'loeschen') {
      for (const t of ['wertung', 'berichte', 'rekord']) this.sql.exec(`DELETE FROM ${t} WHERE sid = ?`, me.id);
      this.sql.exec('DELETE FROM spieler WHERE id = ?', me.id); return json({ ok: true });
    }
    return json({ error: 'not found' }, 404);
  }
}


// ---------- Wertung ----------
const SPIELE = ['3ps', 'raum', 'grenz', 'stern'];
const STUFEN = ['master', 'hard', 'medium', 'easy'];
const SEATS = ['B', 'G', 'R', 'Y', 'L', 'T', 'O', 'I'];
const START = 1500, PROV = 10;
// rang: Gruppen von Plätzen, beste zuerst, z. B. Matt [["G"],["B","R"]] oder Punkte [["R"],["G"],["B"]].
// Wer in derselben Gruppe steht, wird nicht miteinander verglichen: Bei Matt haben alle anderen gleich verloren.
function checkRang(r) {
  if (!Array.isArray(r) || !r.length || r.length > 8) return null;
  const seen = new Set();
  for (const g of r) { if (!Array.isArray(g) || !g.length) return null; for (const p of g) { if (!SEATS.includes(p) || seen.has(p)) return null; seen.add(p); } }
  return r.map((g) => g.slice().sort());
}
const groupOf = (rang, p) => rang.findIndex((g) => g.includes(p));
Spieler.prototype.wert = function (sid, spiel) {
  const r = [...this.sql.exec('SELECT * FROM wertung WHERE sid = ? AND spiel = ?', sid, spiel)][0];
  return r || { sid, spiel, elo: START, partien: 0, siege: 0 };
};
Spieler.prototype.ergebnis = function (me, b) {
  const spiel = SPIELE.includes(b.spiel) ? b.spiel : null, rang = checkRang(b.rang);
  if (!spiel || !rang || typeof b.key !== 'string' || !/^[0-9a-f]{64}$/.test(b.key) || !SEATS.includes(b.seat) || groupOf(rang, b.seat) < 0) return { error: 'ungültiges Ergebnis' };
  const rs = JSON.stringify(rang), now = Date.now();
  const other = [...this.sql.exec('SELECT seat FROM berichte WHERE key = ? AND sid = ? AND seat != ?', b.key, me.id, b.seat)];
  if (other.length) return { error: 'Ein Spielername kann nur einen Platz einer Partie melden.' };
  this.sql.exec('INSERT OR IGNORE INTO berichte (key, seat, sid, spiel, rang, t) VALUES (?, ?, ?, ?, ?, ?)', b.key, b.seat, me.id, spiel, rs, now);
  // Alte, nie bestätigte Meldungen nach 30 Tagen aufräumen
  this.sql.exec('DELETE FROM berichte WHERE t < ?', now - 30 * 86400e3);
  const rows = [...this.sql.exec('SELECT * FROM berichte WHERE key = ? AND rang = ?', b.key, rs)];
  if (new Set(rows.map((r) => r.sid)).size < 2) return { ok: true, status: 'wartet', info: 'Die Partie zählt, sobald ein zweiter Mitspieler mit Spielernamen dasselbe Ergebnis meldet.' };
  const neu = rows.filter((r) => !r.gezaehlt);
  if (!neu.length) return { ok: true, status: 'gezaehlt' };
  const alle = rows, n = alle.length, seats = rang.reduce((a, g) => a + g.length, 0);   // K wird auf alle Plätze der Partie verteilt – so verlieren alle Verlierer gleich viel, egal wer wann meldet
  const W = {}; for (const r of alle) W[r.seat] = this.wert(r.sid, spiel);
  const delta = {}; for (const r of alle) delta[r.seat] = 0;
  const isNeu = new Set(neu.map((r) => r.seat));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = alle[i].seat, c = alle[j].seat;
    if (!isNeu.has(a) && !isNeu.has(c)) continue;            // schon früher gegeneinander gewertet
    const ga = groupOf(rang, a), gc = groupOf(rang, c);
    if (ga === gc) continue;                                  // gleiche Gruppe: kein Vergleich
    const sa = ga < gc ? 1 : 0, ea = 1 / (1 + Math.pow(10, (W[c].elo - W[a].elo) / 400));
    const ka = (W[a].partien < PROV ? 32 : 20) / Math.max(1, seats - 1), kc = (W[c].partien < PROV ? 32 : 20) / Math.max(1, seats - 1);
    delta[a] += ka * (sa - ea); delta[c] += kc * ((1 - sa) - (1 - ea));
  }
  const out = {};
  for (const r of alle) {
    const w = W[r.seat], nw = isNeu.has(r.seat);
    const sieg = nw && rang[0].length === 1 && rang[0][0] === r.seat ? 1 : 0;
    this.sql.exec('INSERT OR REPLACE INTO wertung (sid, spiel, elo, partien, siege) VALUES (?, ?, ?, ?, ?)', r.sid, spiel, w.elo + delta[r.seat], w.partien + (nw ? 1 : 0), w.siege + sieg);
    if (r.sid === me.id) out.elo = Math.round(w.elo + delta[r.seat]), out.aenderung = Math.round(delta[r.seat]);
  }
  for (const r of neu) this.sql.exec('UPDATE berichte SET gezaehlt = 1 WHERE key = ? AND seat = ?', b.key, r.seat);
  return { ok: true, status: 'gezaehlt', ...out };
};
// Rekorde gegen den Computer: vom Gerät gemeldete Siege je Spielstärke (nur Partien mit genau einem Menschen)
Spieler.prototype.rekord = function (me, b) {
  const spiel = SPIELE.includes(b.spiel) ? b.spiel : null, stufe = STUFEN.includes(b.stufe) ? b.stufe : null;
  const z = Math.round(+b.zuege || 0);
  if (!spiel || !stufe || z < 2 || z > 2000 || typeof b.key !== 'string' || !/^[0-9a-f]{64}$/.test(b.key)) return { error: 'ungültig' };
  if ([...this.sql.exec('SELECT 1 FROM berichte WHERE key = ?', b.key)].length) return { ok: true, status: 'schon gemeldet' };
  this.sql.exec('INSERT INTO berichte (key, seat, sid, spiel, rang, t, gezaehlt) VALUES (?, ?, ?, ?, ?, ?, 1)', b.key, 'K', me.id, spiel, 'computer', Date.now());
  const r = [...this.sql.exec('SELECT * FROM rekord WHERE sid = ? AND spiel = ? AND stufe = ?', me.id, spiel, stufe)][0];
  this.sql.exec('INSERT OR REPLACE INTO rekord (sid, spiel, stufe, siege, bestzuege) VALUES (?, ?, ?, ?, ?)', me.id, spiel, stufe, (r ? r.siege : 0) + 1, r ? Math.min(r.bestzuege, z) : z);
  return { ok: true, status: 'gezaehlt' };
};

export async function spielerRoute(req, env, url) {
  if (!env.SPIELER) return json({ error: 'Spielernamen sind auf diesem Server nicht eingerichtet' }, 501);
  const stub = env.SPIELER.get(env.SPIELER.idFromName('spieler'));
  const r = await stub.fetch(new Request('https://do' + url.pathname + url.search, { method: req.method, headers: req.headers, body: req.method === 'POST' ? await req.text() : undefined }));
  return new Response(r.body, { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } });
}
