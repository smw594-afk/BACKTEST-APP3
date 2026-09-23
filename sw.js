// A-QUANT(ST) PWA Service Worker for Web Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || '[A-QUANT] 자동주문 알림';
  const options = {
    body: data.body || '',
    icon: data.icon || './images/logo-square-192-v2.png',
    badge: data.badge || './images/logo.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || './index.html',
      timestamp: Date.now()
    },
    requireInteraction: !!data.requireInteraction,
    tag: data.tag || 'a-quant-order-notification'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : './index.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (client.url.includes('index.html') || client.url.endsWith('/')) {
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
