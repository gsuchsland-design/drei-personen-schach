// Drei-Personen-Schach – Geräte verbinden: alles von einem Gerät auf ein anderes übertragen
// Das sendende Gerät verschlüsselt seine Daten (Spielername, Fernpartien, Online-Partien, Einstellungen) mit einem
// kurzen Code und legt nur den verschlüsselten Block hier ab. Der Server kennt weder den Code noch den Inhalt:
// Er bekommt nur einen Hash des Codes als Ablagenummer. Der Block liegt höchstens 15 Minuten bereit und wird
// beim ersten Abholen gelöscht. © 2026 Guido Suchsland

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } });

const TTL = 15 * 60 * 1000, MAX = 4_000_000, CHUNK = 100_000;
const okId = (s) => typeof s === 'string' && /^[0-9a-f]{64}$/.test(s);

export class Umzug {
  constructor(state) { this.state = state; this.st = state.storage; }
  async fetch(req) {
    const u = new URL(req.url);
    if (u.pathname === '/put') {
      const data = await req.text();
      if (!data || data.length > MAX) return json({ error: 'Die Daten sind zu groß.' }, 413);
      const until = await this.st.get('until');
      if (until && until > Date.now()) return json({ error: 'Dieser Code ist schon vergeben.' }, 409);
      await this.st.deleteAll();
      const n = Math.ceil(data.length / CHUNK), put = { n, until: Date.now() + TTL };
      for (let i = 0; i < n; i++) put['c' + i] = data.slice(i * CHUNK, (i + 1) * CHUNK);
      await this.st.put(put);
      await this.st.setAlarm(Date.now() + TTL);
      return json({ ok: true, until: put.until });
    }
    if (u.pathname === '/get') {
      const until = await this.st.get('until');
      if (!until || until < Date.now()) { await this.st.deleteAll(); return json({ error: 'Code unbekannt oder abgelaufen.' }, 404); }
      const n = await this.st.get('n'), keys = [];
      for (let i = 0; i < n; i++) keys.push('c' + i);
      const m = await this.st.get(keys);
      const data = keys.map((k) => m.get(k) || '').join('');
      await this.st.deleteAll();
      return json({ data });
    }
    return json({ error: 'nicht gefunden' }, 404);
  }
  async alarm() { await this.st.deleteAll(); }
}

// POST /umzug/put {id, data} · POST /umzug/get {id}
export async function umzugRoute(req, env, url) {
  if (!env.UMZUG) return json({ error: 'Geräte verbinden ist auf diesem Server nicht eingerichtet' }, 501);
  if (req.method !== 'POST') return json({ error: 'POST erwartet' }, 405);
  let b; try { b = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  if (!okId(b.id)) return json({ error: 'bad id' }, 400);
  const stub = env.UMZUG.get(env.UMZUG.idFromName(b.id));
  if (url.pathname === '/umzug/put') {
    if (typeof b.data !== 'string') return json({ error: 'bad data' }, 400);
    const r = await stub.fetch(new Request('https://do/put', { method: 'POST', body: b.data }));
    return new Response(r.body, { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } });
  }
  if (url.pathname === '/umzug/get') {
    const r = await stub.fetch(new Request('https://do/get', { method: 'POST' }));
    return new Response(r.body, { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } });
  }
  return json({ error: 'nicht gefunden' }, 404);
}
