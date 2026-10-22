// Drei-Personen-Schach – eigener Server auf Cloudflare Workers
// 1. Vermittlungsdienst (kompatibel mit dem PeerJS-Protokoll): Die Geräte finden sich hierüber und
//    tauschen die Verbindungsdaten aus. Spielzüge, Bild und Ton laufen danach direkt zwischen den Geräten.
// 2. /turn: kurzlebige Zugangsdaten für die Cloudflare-TURN-Weiterleitung (für Netze, die direkte Verbindungen blockieren).
// 3. /fern/…: Fernpartien – Spielstand liegt auf dem Server, Benachrichtigung per Web-Push (siehe fern.js).
// 4. /ai/bericht: KI-Bericht zur Spielanalyse (Cloudflare Workers AI).
// 5. /lobby: öffentliche Liste offener Einladungen (siehe lobby.js).
// © 2026 Guido Suchsland

import { fernRoute, Fern } from './fern.js';
import { lobbyRoute, Lobby } from './lobby.js';
import { spielerRoute, Spieler } from './spieler.js';
export { Fern, Lobby, Spieler };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS, ...extra } });

function randomId() {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}

async function turnServers(env) {
  // Leerzeichen/Zeilenumbrüche, die beim Einfügen mitrutschen, entfernen
  const id = String(env.TURN_KEY_ID || '').trim(), tok = String(env.TURN_KEY_TOKEN || '').trim();
  if (!id || !tok) return [];
  const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(id)}/credentials/generate-ice-servers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl: 86400 }),
  });
  if (!r.ok) throw new Error(`TURN ${r.status} (ID ${id.length} Zeichen, Token ${tok.length} Zeichen)`);
  const data = await r.json();
  // Port 53 läuft im Browser nur in Zeitüberschreitungen – herausfiltern
  return (data.iceServers || []).map(s => ({ ...s, urls: [].concat(s.urls).filter(u => !/:53(\?|$)/.test(u)) }))
    .filter(s => s.urls.length);
}

// ---------- KI-Bericht zur Spielanalyse ----------
// Bekommt die Fakten der Analyse (Text) und lässt ein kleines Sprachmodell daraus einen lesbaren Bericht schreiben.
// Das Modell rechnet kein Schach – die Fakten stammen aus der Analyse im Browser.
const AI_MODEL = '@cf/mistralai/mistral-small-3.1-24b-instruct';
const LANGNAME = { de: 'Deutsch', en: 'English', fr: 'Français', es: 'Español', it: 'Italiano', pt: 'Português', nl: 'Nederlands', pl: 'Polski', tr: 'Türkçe', ru: 'Русский', uk: 'Українська', zh: '中文', ja: '日本語', ko: '한국어', th: 'ไทย', ar: 'العربية', is: 'Íslenska', da: 'Dansk' };
async function aiReport(req, env) {
  if (!env.AI) return json({ error: 'KI ist auf diesem Server nicht eingerichtet' }, 501);
  let b; try { b = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const facts = String(b.facts || '').slice(0, 9000), lang = LANGNAME[b.lang] ? b.lang : 'de';
  if (facts.length < 50) return json({ error: 'zu wenig Daten' }, 400);
  const GAMES = { raum: 'Schach der 6 Reiche (Schach im Würfel aus 8 × 8 × 8 Feldern für 2 bis 6 Spieler; Bündnisse sind erlaubt)',
    grenz: 'Schach ohne Grenzen (normales Schach auf einem unendlichen Brett für 2 bis 4 Spieler; Bündnisse sind erlaubt)',
    stern: 'Sternschach (Schach im Sterntetraeder, dem räumlichen Davidstern, für 2 bis 8 Spieler; die Heere stehen in den Spitzen; Bündnisse sind erlaubt)' };
  const gameTxt = GAMES[b.game] || 'Drei-Personen-Schach (drei Spieler, Bündnisse und Verrat sind erlaubt, Mitschrift der Gespräche nur mit Zustimmung aller)';
  const system = 'Du bist ein erfahrener Schachtrainer und Spielpsychologe. Du bekommst die automatische Auswertung einer Partie ' +
    gameTxt + '. ' +
    'Schreibe daraus einen lebendigen, fairen Bericht mit höchstens 280 Wörtern, Sprache: ' + LANGNAME[lang] + '. ' +
    'Gliederung mit kurzen Zwischenüberschriften: Verlauf, Wendepunkte, Spielweise und Psychologie, Tipps. ' +
    'Regeln: Nutze ausschließlich die gegebenen Fakten; erfinde keine Züge, Zahlen, Zitate oder Ereignisse (zum Beispiel kein Ende eines Bündnisses, wenn es nicht in den Fakten steht). ' +
    'Spieler mit dem Zusatz (Computer) sind Programme: beschreibe sie kurz, gib ihnen aber keine Tipps. Tipps nur für Menschen, jeweils einen konkreten. ' +
    'Psychologie heißt Spielverhalten unter Druck (zum Beispiel mehr Fehler nach Verlusten, Rachezüge, Bündnistreue) – keine Diagnosen, keine Urteile über die Person, kein Spott. ' +
    'Wo die Fakten eine kognitive Verzerrung nennen (mit „→“ markiert, z. B. Sunk-Cost-Effekt oder Verlustaversion), benenne sie klar beim Namen und erkläre in einem Satz, woran sie sich in dieser Partie gezeigt hat. ' +
    'Enthalten die Fakten eine freiwillige Selbsteinschätzung, füge vor den Tipps einen Abschnitt „Selbstbild und Spiel“ hinzu: Vergleiche behutsam, wie sich der Spieler eingeschätzt hat, mit dem, was er laut Auswertung und Mitschrift tatsächlich getan und gesagt hat. Würdige Übereinstimmungen, formuliere Abweichungen als Anregung zum Nachdenken über das eigene Denken (Metakognition), nie als Vorwurf, und bedenke, dass sich auch die Auswertung irren kann. Dann dürfen es höchstens 360 Wörter sein. ' +
    'Hinweise auf mögliche Computerhilfe nur bei Menschen und nur vorsichtig als Hinweis. Ironie oder Bluffs in der Mitschrift darfst du deuten, kennzeichne das als Vermutung.';
  try {
    const r = await env.AI.run(AI_MODEL, { messages: [{ role: 'system', content: system }, { role: 'user', content: facts }], max_tokens: 800, temperature: 0.5 });
    let text = r && (r.response !== undefined ? r.response : r.result && r.result.response);
    if (text && typeof text === 'object') text = text.text || text.report || JSON.stringify(text);
    text = String(text || '');
    if (!text) return json({ error: 'leere Antwort' }, 502);
    return json({ text }, 200, { 'Cache-Control': 'no-store' });
  } catch (e) {
    const m = String(e && e.message || e);
    return json({ error: /limit|quota|neuron|429/i.test(m) ? 'Tageskontingent aufgebraucht – morgen wieder.' : m }, /limit|quota|neuron|429/i.test(m) ? 429 : 502);
  }
}

// ---------- Computergegner im Gespräch ----------
// Ein Monster antwortet in seinem Charakter auf eine Nachricht eines Menschen und entscheidet, ob es ein Bündnis eingeht.
async function aiMonster(req, env) {
  if (!env.AI) return json({ error: 'KI ist auf diesem Server nicht eingerichtet' }, 501);
  let b; try { b = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const lang = LANGNAME[b.lang] ? b.lang : 'de', cut = (x, n) => String(x || '').slice(0, n);
  const GN = { raum: 'Schach der 6 Reiche', grenz: 'Schach ohne Grenzen', stern: 'Sternschach' };
  // Sprechweise je Monster – damit jedes unverwechselbar klingt
  const STYLE = {
    Blubbo: 'Du bist ein glibberiger, verspielter Schleim-Klecks. Du sagst oft „Blubb!“ und „Hihi!“, freust dich über alles und redest wie ein aufgeregtes Kind.',
    Grumbo: 'Du bist ein großer, brummiger Oger. Du sprichst von dir in der dritten Person („Grumbo will …“), in ganz kurzen Sätzen, und knurrst gern „Grrr“ oder „Hmpf“.',
    Flammo: 'Du bist eine kleine, hitzköpfige Flamme. Du redest schnell, prahlst gern und benutzt Feuerwörter wie „heiß“, „Funken“, „zack“.',
    Zappo: 'Du bist ein flinker Blitz-Kobold. Du redest hektisch, machst „Bzzzt!“ und Wortspiele mit Strom, Spannung und Kurzschluss.',
    Spuki: 'Du bist ein kleines Gespenst. Du flüsterst geheimnisvoll, sagst „Huuuh…“ und machst gruselige, aber freundliche Andeutungen.',
    Kraki: 'Du bist ein gemütlicher Krake aus der Tiefsee. Du redest langsam, sagst „Blubb“ und vergleichst alles mit dem Meer und deinen acht Armen.',
    Sonno: 'Du bist eine fröhliche kleine Sonne. Du strahlst, lobst gern und sprichst von Licht, Wärme und Sonnenschein.',
    Fluffi: 'Du bist ein zuckersüßes Flauschmonster. Du klingst niedlich („Hihi“, „Kuschelig!“), bist aber heimlich gerissen.' };
  const system = `Du bist ${cut(b.monster, 20)}, ein Monster-Computergegner im Spiel ${GN[b.game] || 'Drei-Personen-Schach'}. Charakter: ${cut(b.persona, 300)}. ${STYLE[b.monster] || ''} ` +
    `Antworte immer in dieser Sprache: ${LANGNAME[lang]}. Antworte sehr kurz (ein, höchstens zwei kurze Sätze) mit einfachen Wörtern, die auch Kinder verstehen – lustig, frech und ganz in deinem Monster-Charakter, ohne Beleidigungen und ohne Gewalt. ` +
    'Beziehe dich nur auf das, was der Mensch geschrieben hat, und auf die Spielsituation unten. Erfinde keine Züge, Felder, Regeln oder Ereignisse, die dort nicht stehen. Wenn du etwas nicht weißt, antworte mit einem kurzen Spruch in deinem Charakter statt mit Unsinn. ' +
    'Du darfst bluffen und verhandeln. Wenn dir jemand ein Bündnis gegen einen anderen Spieler vorschlägt, entscheide nach deinem Charakter und der Spielsituation (gegen den Führenden lohnt es sich eher). ' +
    'Gib NUR ein JSON-Objekt zurück, ohne weiteren Text: {"reply":"…","deal":"accept"|"decline"|"none","target":"<Name des Spielers, gegen den sich das Bündnis richtet, oder leer>"}. ' +
    '"deal" ist "none", wenn kein Bündnis vorgeschlagen wurde.';
  const user = `Spielsituation:\n${cut(b.situation, 1200)}\n\nBisheriges Gespräch:\n${(Array.isArray(b.history) ? b.history : []).slice(-8).map((h) => cut(h.name, 20) + ': ' + cut(h.text, 200)).join('\n')}\n\nNeue Nachricht von ${cut(b.from, 20)}: ${cut(b.text, 300)}`;
  try {
    const r = await env.AI.run(AI_MODEL, { messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: 160, temperature: 0.6 });
    const resp = r && (r.response !== undefined ? r.response : r.result && r.result.response);
    let o = null, raw = '';
    if (resp && typeof resp === 'object') o = resp;   // manche Modelle liefern das JSON schon fertig gelesen
    else { raw = String(resp || ''); const m = raw.match(/\{[\s\S]*\}/); try { o = m ? JSON.parse(m[0]) : null; } catch (e) {} }
    if (!o || !o.reply) o = { reply: raw.replace(/[{}"]/g, '').slice(0, 240), deal: 'none', target: '' };
    return json({ reply: cut(o.reply, 300), deal: ['accept', 'decline'].includes(o.deal) ? o.deal : 'none', target: cut(o.target, 30) }, 200, { 'Cache-Control': 'no-store' });
  } catch (e) {
    const q = /limit|quota|neuron|429/i.test(String(e && e.message || e));
    return json({ error: q ? 'quota' : String(e && e.message || e) }, q ? 429 : 502);
  }
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
    if (url.pathname.startsWith('/fern/')) return fernRoute(req, env, url);
    if (url.pathname === '/lobby' || url.pathname.startsWith('/lobby/')) return lobbyRoute(req, env, url);
    if (url.pathname.startsWith('/spieler/')) return spielerRoute(req, env, url);
    if (url.pathname === '/ai/bericht' && req.method === 'POST') return aiReport(req, env);
    if (url.pathname === '/ai/monster' && req.method === 'POST') return aiMonster(req, env);
    if (url.pathname === '/peerjs/id') return new Response(randomId(), { headers: { 'Content-Type': 'text/plain', ...CORS } });
    if (url.pathname === '/peerjs/peers') return json([], 401);
    if (url.pathname === '/turn') {
      try { return json({ iceServers: await turnServers(env), signal: true }, 200, { 'Cache-Control': 'no-store' }); }
      catch (e) { return json({ iceServers: [], signal: true, error: String(e.message || e) }, 502); }
    }
    if (url.pathname === '/' || url.pathname === '/peerjs/') {
      return json({ name: 'Drei-Personen-Schach-Server', ok: true, turn: !!(env.TURN_KEY_ID && env.TURN_KEY_TOKEN), fern: !!env.FERN, lobby: !!env.LOBBY, spieler: !!env.SPIELER });
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
