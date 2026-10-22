# Hinweise für die Arbeit an diesem Projekt

- Vor jedem Commit, der die Webseite ändert: `python3 tools/release.py` ausführen. Es setzt den Versionsstand
  (version.json, `data-v` am Skript-Tag von lib/update.js auf allen Seiten, `APP_VER` in spiel.html).
  Nur so sehen Spieler mit alter Seite unten den pulsierenden Hinweis „🆕 Neue Version“.
- Änderungen unter `server/` werden per GitHub Actions automatisch auf Cloudflare veröffentlicht.
- Sprache des Projekts und der Commit-Nachrichten: Deutsch.
