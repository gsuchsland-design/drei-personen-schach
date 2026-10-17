# Eigener Server (Cloudflare Worker)

- **Vermittlungsdienst** (PeerJS-kompatibel): `wss://dreischach.<subdomain>.workers.dev/peerjs`
- **TURN-Zugangsdaten**: `GET /turn` → `{ iceServers: [...] }` (Cloudflare Realtime TURN)

Veröffentlicht wird automatisch per GitHub Actions (`.github/workflows/server.yml`), sobald sich etwas in `server/` ändert,
oder von Hand unter *Actions → Server auf Cloudflare veröffentlichen → Run workflow*.

Benötigte GitHub-Secrets: `CLOUDFLARE_API_TOKEN` (Vorlage „Edit Cloudflare Workers“), optional `CLOUDFLARE_ACCOUNT_ID`,
`TURN_KEY_ID` und `TURN_KEY_TOKEN` (Cloudflare-Dashboard → Realtime → TURN Server).

Lokal testen: `npm i && npx wrangler dev --local --port 8787`, dann das Spiel mit `?peerhost=127.0.0.1&peerport=8787` öffnen.
