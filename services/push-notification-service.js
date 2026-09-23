/**
 * A-QUANT(ST) PWA Web Push Notification Service
 * Manages service worker registration, push subscription, and communication with GCP VM.
 */

(function () {
  "use strict";

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const PushNotificationService = {
    swRegistration: null,
    isSupported: false,

    async init() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        console.log('[WebPush] 브라우저가 웹 푸시를 지원하지 않습니다.');
        this.isSupported = false;
        return false;
      }
      this.isSupported = true;

      try {
        const reg = await navigator.serviceWorker.register('./sw.js');
        this.swRegistration = reg;
        console.log('[WebPush] Service Worker 등록 완료:', reg.scope);
        return true;
      } catch (err) {
        console.warn('[WebPush] Service Worker 등록 실패:', err.message);
        return false;
      }
    },

    getPermission() {
      if (!('Notification' in window)) return 'unsupported';
      return Notification.permission; // 'granted', 'denied', 'default'
    },

    async getSubscription() {
      if (!this.swRegistration) {
        await this.init();
      }
      if (!this.swRegistration) return null;
      try {
        return await this.swRegistration.pushManager.getSubscription();
      } catch (e) {
        return null;
      }
    },

    async isSubscribed() {
      const sub = await this.getSubscription();
      return !!sub;
    },

    async subscribe() {
      if (!this.isSupported) {
        throw new Error('이 브라우저는 웹 푸시 알림을 지원하지 않습니다.');
      }

      if (Notification.permission === 'denied') {
        throw new Error('브라우저 알림 권한이 차단되어 있습니다. 브라우저 설정에서 알림을 허용해주세요.');
      }

      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        throw new Error('알림 권한이 허용되지 않았습니다.');
      }

      if (!this.swRegistration) {
        await this.init();
      }
      if (!this.swRegistration) {
        throw new Error('Service Worker를 초기화할 수 없습니다.');
      }

      // 1. VM 프록시에서 VAPID 공개키 조회
      if (!window.BrokerService) {
        throw new Error('BrokerService가 로드되지 않았습니다.');
      }

      const vapidRes = await window.BrokerService.brokerFetch('/api/push/vapid-public-key', 'GET');
      if (!vapidRes || !vapidRes.publicKey) {
        throw new Error('VAPID 공개키를 VM에서 가져오지 못했습니다: ' + (vapidRes?.error || '알 수 없는 오류'));
      }

      // 2. 브라우저 PushManager 구독
      const applicationServerKey = urlBase64ToUint8Array(vapidRes.publicKey);
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      // 3. VM 프록시에 유저별 구독 등록
      const userId = window.BrokerService.getUserId();
      const regRes = await window.BrokerService.brokerFetch('/api/user/push-subscription', 'POST', {
        userId,
        subscription: subscription.toJSON()
      });

      if (!regRes || !regRes.success) {
        throw new Error('VM에 푸시 구독 등록 실패: ' + (regRes?.error || '알 수 없는 오류'));
      }

      console.log('[WebPush] 푸시 구독 등록 성공 (userId=' + userId + ')');
      return subscription;
    },

    async unsubscribe() {
      const sub = await this.getSubscription();
      if (sub) {
        await sub.unsubscribe();
      }

      if (window.BrokerService) {
        const userId = window.BrokerService.getUserId();
        try {
          await window.BrokerService.brokerFetch('/api/user/push-subscription', 'DELETE', { userId });
        } catch (e) {
          console.warn('[WebPush] VM 구독 삭제 요청 실패 (무시 가능):', e.message);
        }
      }
      console.log('[WebPush] 푸시 구독 해제 완료');
      return true;
    },

    async sendTestPush() {
      if (!window.BrokerService) throw new Error('BrokerService 누락');
      const userId = window.BrokerService.getUserId();
      const res = await window.BrokerService.brokerFetch('/api/user/push-test', 'POST', { userId });
      if (!res || !res.success) {
        throw new Error(res?.error || '테스트 알림 발송 실패');
      }
      return res;
    }
  };

  window.PushNotificationService = PushNotificationService;

  // 페이지 로드 시 백그라운드에서 Service Worker 사전 초기화
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      PushNotificationService.init().catch(() => {});
    });
  }
})();
