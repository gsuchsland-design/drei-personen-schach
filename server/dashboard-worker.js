// Drei-Personen-Schach – Weiterleitungs-Zugang (TURN) als Cloudflare Worker
// Zum direkten Einfügen im Cloudflare-Dashboard. Benötigt die Variablen TURN_KEY_ID und TURN_KEY_TOKEN.
// © 2026 Guido Suchsland

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS },
  });
}

async function turnServers(env) {
  if (!env.TURN_KEY_ID || !env.TURN_KEY_TOKEN) return [];
  const r = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.TURN_KEY_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 86400 }),
    }
  );
  if (!r.ok) throw new Error('TURN ' + r.status);
  const data = await r.json();
  // Adressen mit Port 53 funktionieren im Browser nicht – herausfiltern
  return (data.iceServers || [])
    .map(s => ({ ...s, urls: [].concat(s.urls).filter(u => !/:53(\?|$)/.test(u)) }))
    .filter(s => s.urls.length);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (url.pathname === '/turn') {
      try {
        return json({ iceServers: await turnServers(env), signal: false });
      } catch (e) {
        return json({ iceServers: [], signal: false, error: String(e.message || e) }, 502);
      }
    }
    if (url.pathname === '/') {
      return json({ name: 'Drei-Personen-Schach-Server', ok: true, turn: !!(env.TURN_KEY_ID && env.TURN_KEY_TOKEN), signal: false });
    }
    return json({ error: 'not found' }, 404);
  },
};
