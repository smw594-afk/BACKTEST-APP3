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

  // ⭐️ 안드로이드 상단바/알림 카드에 앱 아이콘이 정상 표시되도록 절대 URL로 변환
  const scopeUrl = self.registration.scope || self.location.origin;
  const iconPath = data.icon || 'images/logo-square-192-v2.png';
  const iconUrl = iconPath.startsWith('http') ? iconPath : new URL(iconPath, scopeUrl).href;

  const title = data.title || '[A-QUANT] 자동주문 알림';
  const options = {
    body: data.body || '',
    icon: iconUrl,
    // ⚠️ 안드로이드는 badge에 불투명 사각 이미지를 넣으면 전체를 '하얀 네모'로 마스킹합니다.
    // badge 속성을 제외하면 안드로이드 시스템이 앱 컬러 아이콘을 정상 표시합니다.
    vibrate: [200, 100, 200],
    data: {
      url: data.url || './index.html?view=log',
      timestamp: Date.now()
    },
    requireInteraction: !!data.requireInteraction,
    tag: data.tag || 'a-quant-order-notification'
  };

  if (data.badge && data.badge.includes('badge')) {
    options.badge = data.badge.startsWith('http') ? data.badge : new URL(data.badge, scopeUrl).href;
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = (event.notification && event.notification.data) || {};
  let rawUrl = notifData.url || './index.html?view=log';
  const isDepositWarning = (notifData.type === 'DEPOSIT_WARNING' || rawUrl.includes('deposit_warning'));

  if (!isDepositWarning && !rawUrl.includes('view=') && !rawUrl.includes('action=')) {
    rawUrl += (rawUrl.includes('?') ? '&' : '?') + 'view=log';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열려 있는 창에 알림 종류에 맞게 모달 열기 메시지 전송 후 첫 번째 탭 포커스
      const candidates = clientList.filter(c => c.url && 'focus' in c);
      const msgType = isDepositWarning ? 'OPEN_DEPOSIT_WARNING_MODAL' : 'OPEN_GCP_LOGS_MODAL';
      candidates.forEach(c => {
        try { c.postMessage({ type: msgType, payload: notifData }); } catch (e) {}
      });
      if (candidates.length) return candidates[0].focus();
      if (self.clients.openWindow) {
        return self.clients.openWindow(rawUrl);
      }
    })
  );
});
