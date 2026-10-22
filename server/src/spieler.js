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
    if (act === 'loeschen') { this.sql.exec('DELETE FROM spieler WHERE id = ?', me.id); return json({ ok: true }); }
    return json({ error: 'not found' }, 404);
  }
}

export async function spielerRoute(req, env, url) {
  if (!env.SPIELER) return json({ error: 'Spielernamen sind auf diesem Server nicht eingerichtet' }, 501);
  const stub = env.SPIELER.get(env.SPIELER.idFromName('spieler'));
  const r = await stub.fetch(new Request('https://do' + url.pathname + url.search, { method: req.method, headers: req.headers, body: req.method === 'POST' ? await req.text() : undefined }));
  return new Response(r.body, { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } });
}
