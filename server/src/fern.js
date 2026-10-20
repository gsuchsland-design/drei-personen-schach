// Drei-Personen-Schach – Fernpartien (asynchron)
// Jede Partie ist ein eigenes Durable Object: Es hält Spielstand, Platzzuordnung und Push-Anmeldungen,
// auch wenn gerade niemand online ist. Wer am Zug ist, bekommt eine Web-Push-Benachrichtigung.
// Die Spielregeln prüft der Browser; der Server achtet auf Reihenfolge, Plätze und Versionsnummer.
// © 2026 Guido Suchsland

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } });

import { lobbyCall, safeName } from './lobby.js';

const ORDER = ['B', 'G', 'R'];
const ALL = ['B', 'G', 'R', 'Y', 'L', 'T'];   // Raumschach: bis zu sechs Spieler
const ord = (g) => g.order || ORDER;
const LEVELS = ['easy', 'medium', 'hard', 'master'];
const KEEP_MS = 120 * 86400e3;          // unbenutzte Partien werden nach 120 Tagen gelöscht
const AI_NUDGE_MS = 45e3;               // Computer am Zug, aber niemand rechnet → nächsten Menschen wecken
const MAX_SNAP = 400e3;

const enc = new TextEncoder();
const b64u = (buf) => {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ''; for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64u = (s) => {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};
const concat = (...arrs) => {
  const n = arrs.reduce((a, b) => a + b.length, 0), out = new Uint8Array(n); let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
};
function randStr(n, abc = 'abcdefghjkmnpqrstuvwxyz23456789') {
  const b = crypto.getRandomValues(new Uint8Array(n)); let s = '';
  for (const x of b) s += abc[x % abc.length];
  return s;
}
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, n);

// ---------- Web Push (RFC 8291 Verschlüsselung, RFC 8292 VAPID) ----------
async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}
export async function encryptPush(sub, payload) {
  const uaPub = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const ikm = await hkdf(auth, secret, concat(enc.encode('WebPush: info\0'), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const plain = concat(enc.encode(payload), new Uint8Array([2]));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, plain));
  const head = new Uint8Array(21); head.set(salt, 0); new DataView(head.buffer).setUint32(16, 4096); head[20] = 65;
  return concat(head, asPub, ct);
}
async function vapidAuth(endpoint, keys) {
  const aud = new URL(endpoint).origin;
  const h = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const c = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'https://gsuchsland-design.github.io/drei-personen-schach/' })));
  const pk = await crypto.subtle.importKey('jwk', keys.priv, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pk, enc.encode(h + '.' + c));
  return `vapid t=${h}.${c}.${b64u(sig)}, k=${keys.pub}`;
}
// Antwort: 'ok' | 'gone' (Anmeldung ungültig → löschen) | 'fail'
async function sendPush(sub, data, keys) {
  try {
    const body = await encryptPush(sub, JSON.stringify(data));
    const r = await fetch(sub.endpoint, {
      method: 'POST',
      headers: { Authorization: await vapidAuth(sub.endpoint, keys), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '604800', Urgency: 'high' },
      body,
    });
    if (r.status === 404 || r.status === 410) return 'gone';
    return r.ok ? 'ok' : 'fail';
  } catch (e) { return 'fail'; }
}
async function getKeys(env) {
  const stub = env.FERN.get(env.FERN.idFromName('__vapid__'));
  const r = await stub.fetch('https://do/keys');
  return r.json();
}

// ---------- Routen im Worker ----------
export async function fernRoute(req, env, url) {
  if (!env.FERN) return json({ error: 'Fernpartien sind auf diesem Server nicht eingerichtet' }, 501);
  const parts = url.pathname.split('/').filter(Boolean);   // ['fern', ...]
  if (parts[1] === 'key' && req.method === 'GET') { const k = await getKeys(env); return json({ key: k.pub }); }
  if (parts[1] === 'new' && req.method === 'POST') {
    let body; try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
    for (let i = 0; i < 5; i++) {
      const code = randStr(8);
      const stub = env.FERN.get(env.FERN.idFromName('g-' + code));
      const r = await stub.fetch('https://do/new', { method: 'POST', body: JSON.stringify({ ...body, code, _ip: req.headers.get('CF-Connecting-IP') || '' }) });
      if (r.status !== 409) return new Response(r.body, { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } });
    }
    return json({ error: 'kein freier Code' }, 503);
  }
  if (parts[1] === 'g' && parts[2]) {
    const code = parts[2].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (code.length < 6 || code.length > 12) return json({ error: 'bad code' }, 400);
    const stub = env.FERN.get(env.FERN.idFromName('g-' + code));
    const action = parts[3] || 'state';
    const r = await stub.fetch(`https://do/${action}${url.search}`, { method: req.method, body: req.method === 'POST' ? await req.text() : undefined });
    return new Response(r.body, { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } });
  }
  return json({ error: 'not found' }, 404);
}

// ---------- Eine Partie ----------
export class Fern {
  constructor(state, env) { this.state = state; this.env = env; }

  async fetch(req) {
    const url = new URL(req.url), action = url.pathname.slice(1);
    if (action === 'keys') return json(await this.vapidKeys());
    let body = {};
    if (req.method === 'POST') { try { body = JSON.parse(await req.text() || '{}'); } catch (e) { return json({ error: 'bad json' }, 400); } }
    if (action === 'new') return this.create(body);
    const g = await this.state.storage.get('g');
    if (!g) return json({ error: 'not found' }, 404);
    if (action === 'state') return json(await this.view(g, url.searchParams.get('t') || ''));
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    if (action === 'join') return this.join(g, body);
    if (action === 'move') return this.move(g, body);
    if (action === 'push') return this.push(g, body);
    if (action === 'rename') return this.rename(g, body);
    return json({ error: 'not found' }, 404);
  }

  async vapidKeys() {
    let k = await this.state.storage.get('vapid');
    if (!k) {
      const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
      k = { priv: await crypto.subtle.exportKey('jwk', kp.privateKey), pub: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)) };
      await this.state.storage.put('vapid', k);
    }
    return k;
  }

  seatOf(g, t) { return t ? ord(g).find((p) => g.seats[p].tok && g.seats[p].tok === t) || null : null; }

  async view(g, t) {
    const seats = {};
    for (const p of ord(g)) { const s = g.seats[p]; seats[p] = { kind: s.kind, name: s.name || '', lvl: s.lvl || null, push: !!(s.subs && s.subs.length) }; }
    const me = this.seatOf(g, t);
    // Bild & Ton zwischen Mitspielern, die gerade online sind: geheime Verbindungsnamen nur für Mitspieler (nicht für Zuschauer)
    let rtc = null;
    if (me) {
      if (!g.rtc) { g.rtc = randStr(12, '0123456789abcdef'); await this.state.storage.put('g', g); }
      rtc = {}; for (const p of ord(g)) rtc[p] = `dsf-${g.code}-${p}-${g.rtc}`;
    }
    const hide = !me && g.rules && g.rules.spec === 'never' && !g.over;   // Zuschauen nicht erlaubt
    return { code: g.code, v: g.v, snap: hide ? null : g.snap, next: g.next, over: g.over, last: g.last, used: g.used,
      created: g.created, updated: g.updated, age: Date.now() - g.updated, seats, seat: me, rtc, rules: g.rules || { help: true }, pub: !!g.lobby,
      game: g.game || 'dps', order: ord(g) };
  }

  async save(g) {
    await this.state.storage.put('g', g);
    await this.state.storage.setAlarm(Math.min(Date.now() + KEEP_MS, g.nudgeAt || Infinity));
  }

  async create(b) {
    if (await this.state.storage.get('g')) return json({ error: 'exists' }, 409);
    const game = ['raum', 'grenz'].includes(b.game) ? b.game : 'dps';
    let order = ORDER;
    if (game !== 'dps') {
      const o = Array.isArray(b.order) ? b.order.filter((p, i, a) => ALL.includes(p) && a.indexOf(p) === i) : [];
      if (o.length < 2) return json({ error: 'order' }, 400);
      order = o;
    }
    const me = order.includes(b.seat) ? b.seat : order[0];
    const tok = randStr(24, '0123456789abcdef');
    const seats = {};
    for (const p of order) {
      if (p === me) { seats[p] = { kind: 'human', name: clean(b.name, 18) || 'Spieler', tok, subs: [] }; continue; }
      const lvl = b.ai && LEVELS.includes(b.ai[p]) ? b.ai[p] : null;
      seats[p] = lvl ? { kind: 'ai', lvl } : { kind: 'open', subs: [] };
    }
    const now = Date.now();
    const rules = { help: !(b.rules && b.rules.help === false) };
    if (game !== 'dps') {
      const r = b.rules || {}, n = (v, hi) => Math.max(0, Math.min(hi, Math.round(+v || 0)));
      rules.end = r.end === 'last' ? 'last' : 'first'; rules.opts = clean(r.opts, 80);
      rules.spec = r.spec === 'never' ? 'never' : 'always'; rules.live = r.live !== false; rules.tcMove = rules.live ? n(r.tcMove, 3600) : 0; rules.tcGame = rules.live ? n(r.tcGame, 600) : 0;
    }
    const used = {}; for (const p of order) used[p] = 0;
    const g = { code: b.code, created: now, updated: now, v: 0, snap: null, next: order[0], over: false, last: null, used, seats, rules, game };
    if (game !== 'dps') g.order = order;
    if (b.public) {   // in der öffentlichen Lobby anbieten
      seats[me].name = safeName(seats[me].name, 'Spieler');
      const r = await lobbyCall(this.env, 'offer', { kind: 'fern', game, code: b.code, host: seats[me].name, seats: this.lobbySeats(g), order: ord(g),
        rules: { help: rules.help, spec: rules.spec, lvl: null, lang: b.lang, end: rules.end, opts: rules.opts, live: rules.live, tcMove: rules.tcMove, tcGame: rules.tcGame }, _ip: b._ip });
      if (r && r.id) g.lobby = { id: r.id, key: r.key };
    }
    await this.save(g);
    return json({ code: g.code, token: tok, seat: me, state: await this.view(g, tok) });
  }

  lobbySeats(g) { const o = {}; for (const p of ord(g)) { const s = g.seats[p]; o[p] = { kind: s.kind, name: s.name || '', lvl: s.lvl || null }; } return o; }
  lobbySync(g, extra) { if (g.lobby) this.state.waitUntil(lobbyCall(this.env, 'update', { id: g.lobby.id, key: g.lobby.key, seats: this.lobbySeats(g), started: g.v > 0, ...extra })); }

  async join(g, b) {
    const known = this.seatOf(g, b.t);
    if (known) return json({ seat: known, token: b.t, state: await this.view(g, b.t) });
    if (g.over) return json({ error: 'over' }, 409);
    const want = ord(g).includes(b.seat) ? b.seat : null;
    const p = want && g.seats[want].kind === 'open' ? want : ord(g).find((q) => g.seats[q].kind === 'open');
    if (!p) return json({ error: 'full' }, 409);
    const tok = randStr(24, '0123456789abcdef'), name = g.lobby ? safeName(b.name, 'Gast') : (clean(b.name, 18) || 'Gast');
    g.seats[p] = { kind: 'human', name, tok, subs: [] };
    await this.save(g);
    this.lobbySync(g);
    this.state.waitUntil(this.notify(g, ord(g).filter((q) => q !== p), 'join', [name]));
    return json({ seat: p, token: tok, state: await this.view(g, tok) });
  }

  async rename(g, b) {
    const p = this.seatOf(g, b.t);
    if (!p) return json({ error: 'forbidden' }, 403);
    g.seats[p].name = clean(b.name, 18) || g.seats[p].name;
    await this.save(g);
    return json({ ok: true });
  }

  async move(g, b) {
    const me = this.seatOf(g, b.t);
    if (!me) return json({ error: 'forbidden' }, 403);
    if (b.v !== g.v) return json({ error: 'conflict', state: await this.view(g, b.t) }, 409);
    if (g.over) return json({ error: 'over', state: await this.view(g, b.t) }, 409);
    const mover = b.mover;
    if (!ord(g).includes(mover) || mover !== g.next) return json({ error: 'turn', state: await this.view(g, b.t) }, 409);
    const tcOn = g.rules && (g.rules.tcMove || g.rules.tcGame);   // abgelaufene Uhr eines anderen darf jeder Mitspieler melden
    if (mover !== me && g.seats[mover].kind !== 'ai' && !(b.timeout && tcOn && Date.now() - g.updated > 8000)) return json({ error: 'not your seat' }, 403);
    if (typeof b.snap !== 'string' || b.snap.length > MAX_SNAP) return json({ error: 'snap' }, 400);
    const now = Date.now();
    if (g.seats[mover].kind === 'human') g.used[mover] = (g.used[mover] || 0) + now - g.updated;
    g.v += 1; g.snap = b.snap; g.updated = now;
    g.over = !!b.over;
    g.next = g.over ? null : (ord(g).includes(b.next) ? b.next : null);
    g.last = b.last && typeof b.last === 'object' ? { p: mover, from: clean(b.last.from, 5), to: clean(b.last.to, 5), text: clean(b.last.text, 60) } : null;
    g.nudgeAt = null;
    // Wer muss geweckt werden?
    let who = [], kind = 'turn', args = [g.last ? g.last.text : ''];
    if (g.over) { who = ord(g).filter((q) => q !== mover); kind = 'over'; args = [clean(b.result, 120)]; }
    else if (g.next && g.seats[g.next].kind === 'human') who = [g.next];
    else if (g.next && g.seats[g.next].kind === 'ai' && ord(g).includes(b.hint) && g.seats[b.hint].kind === 'human' && b.hint !== me) {
      g.nudgeAt = now + AI_NUDGE_MS; g.nudgeV = g.v; g.nudgeWho = b.hint;   // falls der Computerzug ausbleibt
    }
    await this.save(g);
    if (g.over || g.v === 1) this.lobbySync(g, g.over ? { over: true } : {});
    else if (g.lobby && g.v % 5 === 0) this.lobbySync(g);   // Eintrag lebendig halten
    if (who.length) this.state.waitUntil(this.notify(g, who, kind, args));
    return json({ ok: true, v: g.v, used: g.used });
  }

  async push(g, b) {
    const p = this.seatOf(g, b.t);
    if (!p) return json({ error: 'forbidden' }, 403);
    const s = g.seats[p]; s.subs = s.subs || [];
    const sub = b.sub;
    if (b.off) { s.subs = s.subs.filter((x) => !sub || x.endpoint !== sub.endpoint); await this.save(g); return json({ ok: true, n: s.subs.length }); }
    if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return json({ error: 'bad sub' }, 400);
    const msgs = {};
    for (const k of ['turn', 'over', 'join', 'title']) msgs[k] = clean(b.msgs && b.msgs[k], 160);
    const entry = { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, url: clean(b.url, 300), msgs };
    s.subs = s.subs.filter((x) => x.endpoint !== sub.endpoint).concat(entry).slice(-5);
    await this.save(g);
    if (b.test) {
      const keys = await getKeys(this.env);
      const res = await sendPush(entry, { title: msgs.title || 'Drei-Personen-Schach', body: b.test === true ? '🔔 OK' : clean(b.test, 120), url: entry.url, tag: 'dps-test-' + g.code, code: g.code }, keys);
      return json({ ok: true, test: res });
    }
    return json({ ok: true });
  }

  async notify(g, seats, kind, args) {
    let keys; try { keys = await getKeys(this.env); } catch (e) { return; }
    let changed = false;
    for (const p of seats) {
      const s = g.seats[p]; if (!s || !s.subs || !s.subs.length) continue;
      for (const sub of s.subs.slice()) {
        const tpl = sub.msgs[kind] || ({ turn: '♟ Du bist dran! {0}', over: '🏁 Die Partie ist zu Ende. {0}', join: '👋 {0} spielt mit.' })[kind];
        const body = tpl.replace(/\{(\d+)\}/g, (m, i) => (args[i] == null ? '' : args[i])).trim();
        const res = await sendPush(sub, { title: sub.msgs.title || 'Drei-Personen-Schach', body, url: sub.url, tag: 'dps-' + g.code, code: g.code }, keys);
        if (res === 'gone') { s.subs = s.subs.filter((x) => x !== sub); changed = true; }
      }
    }
    if (changed) { const cur = await this.state.storage.get('g'); if (cur) { for (const p of seats) if (cur.seats[p]) cur.seats[p].subs = g.seats[p].subs; await this.state.storage.put('g', cur); } }
  }

  async alarm() {
    const g = await this.state.storage.get('g');
    if (!g) return;
    const now = Date.now();
    if (now - g.updated >= KEEP_MS - 60e3) { await this.state.storage.deleteAll(); return; }
    if (g.nudgeAt && now >= g.nudgeAt - 1000) {
      const who = g.nudgeWho, still = g.v === g.nudgeV && !g.over && g.next && g.seats[g.next].kind === 'ai';
      g.nudgeAt = null;
      await this.save(g);
      if (still && who) await this.notify(g, [who], 'turn', ['']);
      return;
    }
    await this.save(g);
  }
}
