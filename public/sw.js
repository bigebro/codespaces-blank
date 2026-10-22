self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// PWA суулгах шаардлагыг хангах боловч сүлжээг хэзээ ч таслахгүй хоосон орхино
self.addEventListener('fetch', (event) => {
  return; 
});