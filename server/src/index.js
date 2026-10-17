// Drei-Personen-Schach – eigener Server auf Cloudflare Workers
// 1. Vermittlungsdienst (kompatibel mit dem PeerJS-Protokoll): Die Geräte finden sich hierüber und
//    tauschen die Verbindungsdaten aus. Spielzüge, Bild und Ton laufen danach direkt zwischen den Geräten.
// 2. /turn: kurzlebige Zugangsdaten für die Cloudflare-TURN-Weiterleitung (für Netze, die direkte Verbindungen blockieren).
// © 2026 Guido Suchsland

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS, ...extra } });

function randomId() {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}

async function turnServers(env) {
  if (!env.TURN_KEY_ID || !env.TURN_KEY_TOKEN) return [];
  const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.TURN_KEY_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl: 86400 }),
  });
  if (!r.ok) throw new Error('TURN ' + r.status);
  const data = await r.json();
  // Port 53 läuft im Browser nur in Zeitüberschreitungen – herausfiltern
  return (data.iceServers || []).map(s => ({ ...s, urls: [].concat(s.urls).filter(u => !/:53(\?|$)/.test(u)) }))
    .filter(s => s.urls.length);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

    // WebSocket des Vermittlungsdienstes: /peerjs?key=peerjs&id=…&token=…
    if (url.pathname === '/peerjs' && req.headers.get('Upgrade') === 'websocket') {
      const hub = env.HUB.get(env.HUB.idFromName('hub'));
      return hub.fetch(req);
    }
    if (url.pathname === '/peerjs/id') return new Response(randomId(), { headers: { 'Content-Type': 'text/plain', ...CORS } });
    if (url.pathname === '/peerjs/peers') return json([], 401);
    if (url.pathname === '/turn') {
      try { return json({ iceServers: await turnServers(env), signal: true }, 200, { 'Cache-Control': 'no-store' }); }
      catch (e) { return json({ iceServers: [], signal: true, error: String(e.message || e) }, 502); }
    }
    if (url.pathname === '/' || url.pathname === '/peerjs/') {
      return json({ name: 'Drei-Personen-Schach-Server', ok: true, turn: !!(env.TURN_KEY_ID && env.TURN_KEY_TOKEN) });
    }
    return json({ error: 'not found' }, 404);
  },
};

// Ein zentraler „Hub“ hält alle offenen Verbindungen. Er schläft (Hibernation), solange nichts passiert;
// Herzschläge beantwortet Cloudflare automatisch, ohne ihn aufzuwecken.
export class Hub {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.pending = new Map(); // Empfänger-ID → [{msg, t}] für Nachrichten an noch nicht verbundene Geräte
    try {
      state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"type":"HEARTBEAT"}', '{"type":"HEARTBEAT"}'));
    } catch (e) {}
  }

  sockets(id) {
    return this.state.getWebSockets(id).filter(ws => ws.readyState === 1);
  }

  async fetch(req) {
    const url = new URL(req.url);
    const id = url.searchParams.get('id') || '';
    const token = url.searchParams.get('token') || '';
    const key = url.searchParams.get('key') || '';
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const reply = (msg) => { server.accept(); server.send(JSON.stringify(msg)); server.close(1000, msg.type); };

    if (key !== 'peerjs') { reply({ type: 'INVALID-KEY', payload: { msg: 'Invalid key provided' } }); return new Response(null, { status: 101, webSocket: client }); }
    if (!id || !token || id.length > 64 || !/^[A-Za-z0-9_-]+$/.test(id)) {
      reply({ type: 'ERROR', payload: { msg: 'No id, token, or key supplied to websocket server' } });
      return new Response(null, { status: 101, webSocket: client });
    }
    const existing = this.sockets(id);
    if (existing.length) {
      const att = existing[0].deserializeAttachment() || {};
      // Geräte senden alle 5 s einen Herzschlag. Kam 20 s nichts, ist die alte Verbindung tot (z. B. Handy im Standby)
      let last = att.since || 0;
      try { const ts = this.state.getWebSocketAutoResponseTimestamp(existing[0]); if (ts) last = Math.max(last, ts.getTime()); } catch (e) {}
      const dead = Date.now() - last > 20000;
      if (att.token !== token && !dead) { reply({ type: 'ID-TAKEN', payload: { msg: 'ID is taken' } }); return new Response(null, { status: 101, webSocket: client }); }
      // gleiches Gerät meldet sich neu an (z. B. nach Netzwechsel): alte Verbindung ersetzen
      for (const ws of existing) { try { ws.close(1000, 'replaced'); } catch (e) {} }
    }
    this.state.acceptWebSocket(server, [id]);
    server.serializeAttachment({ id, token, since: Date.now() });
    server.send(JSON.stringify({ type: 'OPEN' }));
    // zwischengespeicherte Nachrichten zustellen
    const q = this.pending.get(id);
    if (q) {
      this.pending.delete(id);
      const now = Date.now();
      for (const p of q) if (now - p.t < 5000) server.send(JSON.stringify(p.msg));
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    let msg;
    try { msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)); } catch (e) { return; }
    const att = ws.deserializeAttachment() || {};
    const src = att.id;
    if (!src || !msg || typeof msg.type !== 'string') return;
    if (msg.type === 'HEARTBEAT') return;
    if (!['OFFER', 'ANSWER', 'CANDIDATE', 'LEAVE', 'EXPIRE'].includes(msg.type) || typeof msg.dst !== 'string') return;
    const out = { type: msg.type, src, dst: msg.dst, payload: msg.payload };
    const dst = this.sockets(msg.dst);
    if (dst.length) { for (const d of dst) { try { d.send(JSON.stringify(out)); } catch (e) {} } return; }
    if (msg.type === 'LEAVE' || msg.type === 'EXPIRE') return;
    // Empfänger (noch) nicht da: 5 Sekunden aufheben, danach dem Absender „nicht erreichbar“ melden
    const list = this.pending.get(msg.dst) || [];
    list.push({ msg: out, t: Date.now() });
    this.pending.set(msg.dst, list.slice(-200));
    setTimeout(() => {
      const l = this.pending.get(msg.dst);
      if (!l || !l.some(p => p.msg === out)) return;   // inzwischen zugestellt
      this.pending.set(msg.dst, l.filter(p => p.msg !== out));
      if (!this.pending.get(msg.dst).length) this.pending.delete(msg.dst);
      if (msg.type !== 'OFFER') return;   // nur einmal pro Verbindungsversuch melden
      for (const s of this.sockets(src)) { try { s.send(JSON.stringify({ type: 'EXPIRE', src: msg.dst, dst: src })); } catch (e) {} }
    }, 5000);
  }

  async webSocketClose(ws) {
    const att = ws.deserializeAttachment() || {};
    try { ws.close(1000, 'bye'); } catch (e) {}
    if (!att.id) return;
  }

  async webSocketError(ws) {
    try { ws.close(1011, 'error'); } catch (e) {}
  }
}
