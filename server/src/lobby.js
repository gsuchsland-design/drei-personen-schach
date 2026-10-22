// Drei-Personen-Schach – öffentliche Lobby
// Eine Liste offener Einladungen (Live-Partien und Fernpartien), die jeder sehen kann.
// Gespeichert wird nur, was in der Liste steht: Spielernamen, Einstellungen der Partie und der Code zum Beitreten.
// Live-Einladungen verschwinden, wenn der Gastgeber 90 Sekunden nichts mehr meldet; Fernpartien nach 14 Tagen ohne Zug
// oder wenn sie zu Ende sind. © 2026 Guido Suchsland

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } });

const LIVE_TTL = 90e3, FERN_TTL = 14 * 86400e3, MAX_ENTRIES = 500, MAX_PER_IP = 6, REPORT_HIDE = 3;
const ORDER = ['B', 'G', 'R'];
const ALL = ['B', 'G', 'R', 'Y', 'L', 'T', 'O', 'I'];
const LEVELS = ['easy', 'medium', 'hard', 'master'];

function randStr(n, abc = 'abcdefghjkmnpqrstuvwxyz23456789') {
  const b = crypto.getRandomValues(new Uint8Array(n)); let s = '';
  for (const x of b) s += abc[x % abc.length];
  return s;
}
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

// ---------- einfacher Filter für beleidigende oder verbotene Namen ----------
const BAD = ['hitler', 'nazi', 'heilhit', 'siegheil', 'ssreich', 'fick', 'fuck', 'arschl', 'hure', 'schlampe', 'fotze', 'nigger', 'nigga', 'neger',
  'kanake', 'wichser', 'bitch', 'cunt', 'faggot', 'schwuchtel', 'porn', 'pussy', 'penis', 'vagina', 'kinderf', 'pedo', 'pädo',
  'missgeburt', 'spast', 'mongo', 'idiot', 'hurensohn', 'bastard', 'whore', 'slut', 'rape', 'vergewalt', 'judensau'];
function norm(s) {
  return String(s).toLowerCase()
    .replace(/[0]/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/[4@]/g, 'a').replace(/[5$]/g, 's').replace(/7/g, 't')
    .replace(/[^a-zäöüß]/g, '');
}
export function badName(s) { const n = norm(s); return !!n && BAD.some((w) => n.includes(w)); }
export const safeName = (s, fb) => { const c = clean(s, 18); return !c || badName(c) ? fb : c; };

function cleanSeats(seats, order) {
  const out = [];
  const ord = Array.isArray(order) && order.length >= 2 ? order.filter((p, i, a) => ALL.includes(p) && a.indexOf(p) === i) : ORDER;
  for (const p of ord) {
    const s = (seats && seats[p]) || {};
    const kind = ['open', 'human', 'ai'].includes(s.kind) ? s.kind : 'open';
    out.push({ p, kind, name: kind === 'human' ? safeName(s.name, 'Spieler') : '', lvl: kind === 'ai' && LEVELS.includes(s.lvl) ? s.lvl : null });
  }
  return out;
}
function cleanRules(r) {
  r = r || {};
  const n = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+v || 0)));
  return {
    help: r.help !== false,
    tcMove: n(r.tcMove, 0, 3600), tcGame: n(r.tcGame, 0, 600),   // Sekunden pro Zug, Minuten pro Partie (0 = aus)
    lvl: LEVELS.includes(r.lvl) ? r.lvl : null,
    cam: !!r.cam, spec: ['ask', 'always', 'never'].includes(r.spec) ? r.spec : 'ask',
    lang: clean(r.lang, 5),
    end: r.end === 'last' ? 'last' : r.end === 'first' ? 'first' : undefined, plaetze: r.plaetze === true ? true : undefined, live: r.live === false ? false : r.live ? true : undefined, opts: r.opts ? clean(r.opts, 80) : undefined, mons: typeof r.mons === 'string' && r.mons ? r.mons.replace(/[^BGRYLTOI:,]/g, '').slice(0, 48) : undefined,
  };
}

export class Lobby {
  constructor(state, env) { this.state = state; this.env = env; this.list = null; }

  async load() {
    if (!this.list) this.list = (await this.state.storage.get('list')) || {};
    return this.list;
  }
  async store() { await this.state.storage.put('list', this.list); }

  purge() {
    const now = Date.now(); let changed = false;
    for (const [id, e] of Object.entries(this.list)) {
      const ttl = e.kind === 'live' ? LIVE_TTL : FERN_TTL;
      if (now - e.seen > ttl || e.over) { delete this.list[id]; changed = true; }
    }
    return changed;
  }

  pub(e) {
    const open = e.seats.filter((s) => s.kind === 'open').length;
    return { id: e.id, kind: e.kind, game: e.game, code: e.code, host: e.host, seats: e.seats, rules: e.rules, started: e.started,
      open, created: e.created, age: Date.now() - e.created };
  }

  async fetch(req) {
    const url = new URL(req.url), action = url.pathname.split('/').filter(Boolean).pop() || 'list';
    await this.load();
    if (req.method === 'GET') {
      if (this.purge()) await this.store();
      const list = Object.values(this.list).filter((e) => (e.reports || []).length < REPORT_HIDE)
        .sort((a, b) => (a.started - b.started) || (b.created - a.created)).map((e) => this.pub(e));
      return json({ list, now: Date.now() });
    }
    let b = {};
    try { b = JSON.parse(await req.text() || '{}'); } catch (e) { return json({ error: 'bad json' }, 400); }
    const ip = req.headers.get('CF-Connecting-IP') || b._ip || '';
    const ipKey = ip ? await hash(ip) : '';

    if (action === 'offer') {
      this.purge();
      const kind = b.kind === 'fern' ? 'fern' : 'live';
      const code = String(b.code || '').toLowerCase();
      if (!/^[a-z0-9]{4,12}$/.test(code)) return json({ error: 'bad code' }, 400);
      if (Object.keys(this.list).length >= MAX_ENTRIES) return json({ error: 'full' }, 503);
      if (ipKey && Object.values(this.list).filter((e) => e.ip === ipKey).length >= MAX_PER_IP) return json({ error: 'too many' }, 429);
      for (const e of Object.values(this.list)) if (e.code === code && e.kind === kind) delete this.list[e.id];   // gleiche Partie neu anbieten
      const now = Date.now(), id = randStr(10), key = randStr(20, '0123456789abcdef');
      const e = { id, key, kind, game: ['raum', 'grenz', 'stern'].includes(b.game) ? b.game : 'dps', code, host: safeName(b.host, 'Gastgeber'), seats: cleanSeats(b.seats, b.order), order: Array.isArray(b.order) ? b.order.slice(0, 6) : null,
        rules: cleanRules(b.rules), started: !!b.started, created: now, seen: now, ip: ipKey, reports: [] };
      this.list[id] = e;
      await this.store();
      return json({ id, key, entry: this.pub(e) });
    }
    const e = this.list[b.id];
    if (action === 'report') {
      if (!e) return json({ ok: true });
      e.reports = e.reports || [];
      if (ipKey && !e.reports.includes(ipKey)) e.reports.push(ipKey);
      await this.store();
      return json({ ok: true });
    }
    if (!e || e.key !== b.key) return json({ error: 'not found' }, 404);
    if (action === 'update') {
      if (b.seats) e.seats = cleanSeats(b.seats, e.order);
      if (b.rules) e.rules = cleanRules(Object.assign({}, e.rules, b.rules));
      if (b.host) e.host = safeName(b.host, e.host);
      if (b.started != null) e.started = !!b.started;
      if (b.over) e.over = true;
      e.seen = Date.now();
      if (e.over) delete this.list[e.id];
      await this.store();
      return json({ ok: true });
    }
    if (action === 'remove') { delete this.list[e.id]; await this.store(); return json({ ok: true }); }
    return json({ error: 'not found' }, 404);
  }
}

async function hash(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('dps-lobby:' + s));
  return [...new Uint8Array(d)].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('');
}

export async function lobbyRoute(req, env, url) {
  if (!env.LOBBY) return json({ error: 'Die Lobby ist auf diesem Server nicht eingerichtet' }, 501);
  const stub = env.LOBBY.get(env.LOBBY.idFromName('lobby'));
  const r = await stub.fetch(new Request('https://do' + url.pathname, { method: req.method, headers: req.headers, body: req.method === 'POST' ? await req.text() : undefined }));
  return new Response(r.body, { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } });
}

// Für Fernpartien: Der Server selbst trägt die Partie ein und hält den Eintrag aktuell
export async function lobbyCall(env, action, body) {
  if (!env.LOBBY) return null;
  try {
    const stub = env.LOBBY.get(env.LOBBY.idFromName('lobby'));
    const r = await stub.fetch('https://do/lobby/' + action, { method: 'POST', body: JSON.stringify(body) });
    return await r.json();
  } catch (e) { return null; }
}
