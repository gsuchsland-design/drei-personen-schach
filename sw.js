// Drei-Personen-Schach – Service Worker nur für Benachrichtigungen (Fernpartien).
// Er speichert nichts zwischen: Das Spiel wird wie bisher immer frisch aus dem Netz geladen.
// © 2026 Guido Suchsland
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of wins) c.postMessage({ t: 'fern', code: d.code || null });   // offene Seiten sofort aktualisieren
    await self.registration.showNotification(d.title || 'Drei-Personen-Schach', {
      body: d.body || '', tag: d.tag || 'dps', renotify: true,
      icon: 'icon2-192.png', badge: 'icon2-192.png', data: { url: d.url || './' },
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil((async () => {
    const want = new URL(url, self.location.href);
    const code = want.searchParams.get('fern');
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of wins) {
      try { if (code && new URL(c.url).searchParams.get('fern') === code && 'focus' in c) { c.postMessage({ t: 'fern', code }); return c.focus(); } } catch (_) {}
    }
    return self.clients.openWindow(want.href);
  })());
});
