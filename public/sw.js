self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  return;
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Operlink', body: 'Шинэ мэдэгдэл байна', url: '/dashboard' };
  try {
    payload = { ...payload, ...(event.data ? event.data.json() : {}) };
  } catch (err) {
    payload.body = event.data ? event.data.text() : payload.body;
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: { url: payload.url || '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(self.clients.openWindow(url));
});
