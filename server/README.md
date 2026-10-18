# Eigener Server (Cloudflare Worker)

- **Vermittlungsdienst** (PeerJS-kompatibel): `wss://dreischach.<subdomain>.workers.dev/peerjs`
- **Fernpartien**: `/fern/…` – Spielstand je Partie in einem Durable Object, Benachrichtigung per Web-Push (Schlüssel erzeugt der Server beim ersten Gebrauch selbst). Quelltext: `src/fern.js`
- **TURN-Zugangsdaten**: `GET /turn` → `{ iceServers: [...] }` (Cloudflare Realtime TURN)

Veröffentlicht wird automatisch per GitHub Actions (`.github/workflows/server.yml`), sobald sich etwas in `server/` ändert,
oder von Hand unter *Actions → Server auf Cloudflare veröffentlichen → Run workflow*.

Benötigte GitHub-Secrets: `CLOUDFLARE_API_TOKEN` (Vorlage „Edit Cloudflare Workers“), optional `CLOUDFLARE_ACCOUNT_ID`,
`TURN_KEY_ID` und `TURN_KEY_TOKEN` (Cloudflare-Dashboard → Realtime → TURN Server).

Nach dem Veröffentlichen schreibt der Workflow die Adresse des Servers in `server.json` im Hauptordner – daraus liest das Spiel sie für Fernpartien.

Lokal testen: `npm i && npx wrangler dev --local --port 8787`, dann das Spiel mit `?peerhost=127.0.0.1&peerport=8787` öffnen.

Fernpartien lokal testen: Spiel mit `?fernhost=127.0.0.1:8787` öffnen.

Erste Veröffentlichung: 18.10.2026 (Subdomain g-suchsland); TURN seit 19.10.2026 (TURN-Token erneuert)
