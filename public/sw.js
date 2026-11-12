self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// PWA суулгах шаардлагыг хангах боловч сүлжээг хэзээ ч таслахгүй хоосон орхино
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Operlink', body: 'Шинэ санал байна' };
  event.waitUntil(self.registration.showNotification(data.title || 'Operlink', { body: data.body || '' }));
});