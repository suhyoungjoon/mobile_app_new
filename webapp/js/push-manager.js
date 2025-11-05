// Push Notification Manager
class PushManager {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.subscription = null;
    this.vapidPublicKey = null;
    this.isSubscribed = false;
    
    if (this.isSupported) {
      this.init();
    } else {
      console.warn('⚠️ Push notifications not supported');
    }
  }
  
  async init() {
    console.log('🔧 PushManager initializing...');
    
    try {
      // VAPID 공개키 가져오기
      await this.getVapidPublicKey();
      
      // 기존 구독 상태 확인
      await this.checkSubscription();
      
      console.log('✅ PushManager initialized');
    } catch (error) {
      console.error('❌ PushManager init failed:', error);
    }
  }
  
  async getVapidPublicKey() {
    try {
      const response = await fetch('/api/push/vapid-key');
      const data = await response.json();
      this.vapidPublicKey = data.publicKey;
      console.log('🔑 VAPID public key loaded');
    } catch (error) {
      console.error('❌ Failed to get VAPID key:', error);
      throw error;
    }
  }
  
  async checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      this.subscription = await registration.pushManager.getSubscription();
      this.isSubscribed = !!this.subscription;
      
      console.log('📱 Subscription status:', this.isSubscribed ? 'Subscribed' : 'Not subscribed');
      
      if (this.isSubscribed) {
        // 서버에 구독 정보 전송
        await this.sendSubscriptionToServer();
      }
    } catch (error) {
      console.error('❌ Failed to check subscription:', error);
    }
  }
  
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Push notifications not supported');
    }
    
    try {
      const permission = await Notification.requestPermission();
      console.log('🔔 Notification permission:', permission);
      
      if (permission === 'granted') {
        return true;
      } else if (permission === 'denied') {
        throw new Error('Notification permission denied');
      } else {
        throw new Error('Notification permission dismissed');
      }
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      throw error;
    }
  }
  
  async subscribe() {
    if (!this.isSupported) {
      throw new Error('Push notifications not supported');
    }
    
    try {
      // 권한 요청
      await this.requestPermission();
      
      const registration = await navigator.serviceWorker.ready;
      
      // 구독 생성
      this.subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });
      
      this.isSubscribed = true;
      console.log('✅ Push subscription created');
      
      // 서버에 구독 정보 전송
      await this.sendSubscriptionToServer();
      
      return this.subscription;
    } catch (error) {
      console.error('❌ Subscription failed:', error);
      throw error;
    }
  }
  
  async unsubscribe() {
    if (!this.subscription) {
      throw new Error('No active subscription');
    }
    
    try {
      const success = await this.subscription.unsubscribe();
      
      if (success) {
        this.subscription = null;
        this.isSubscribed = false;
        console.log('✅ Push subscription removed');
        
        // 서버에서 구독 정보 삭제
        await this.removeSubscriptionFromServer();
      }
      
      return success;
    } catch (error) {
      console.error('❌ Unsubscribe failed:', error);
      throw error;
    }
  }
  
  async sendSubscriptionToServer() {
    if (!this.subscription) {
      throw new Error('No subscription to send');
    }
    
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          subscription: this.subscription,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        console.log('✅ Subscription sent to server');
      } else {
        throw new Error('Failed to send subscription to server');
      }
    } catch (error) {
      console.error('❌ Failed to send subscription:', error);
      throw error;
    }
  }
  
  async removeSubscriptionFromServer() {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        console.log('✅ Subscription removed from server');
      }
    } catch (error) {
      console.error('❌ Failed to remove subscription:', error);
    }
  }
  
  // VAPID 키 변환 헬퍼
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
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
  
  // 구독 상태 확인
  getSubscriptionStatus() {
    return {
      isSupported: this.isSupported,
      isSubscribed: this.isSubscribed,
      permission: Notification.permission,
      subscription: this.subscription
    };
  }
  
  // 테스트 알림 발송
  async sendTestNotification() {
    if (!this.isSubscribed) {
      throw new Error('Not subscribed to push notifications');
    }
    
    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: '테스트 알림',
          body: '푸시 알림이 정상적으로 작동합니다!',
          icon: '/icon-192x192.png'
        })
      });
      
      if (response.ok) {
        console.log('✅ Test notification sent');
      } else {
        throw new Error('Failed to send test notification');
      }
    } catch (error) {
      console.error('❌ Test notification failed:', error);
      throw error;
    }
  }
}

// 전역 PushManager 인스턴스
window.pushManager = new PushManager();

// 사용자 권한 요청 UI
function showNotificationPermissionDialog() {
  const dialog = document.createElement('div');
  dialog.className = 'notification-permission-dialog';
  dialog.innerHTML = `
    <div class="dialog-content">
      <div class="dialog-header">
        <h3>🔔 푸시 알림 설정</h3>
      </div>
      <div class="dialog-body">
        <p>하자 등록 및 점검 결과에 대한 실시간 알림을 받으시겠습니까?</p>
        <ul>
          <li>✅ 하자 등록 완료 알림</li>
          <li>✅ 점검 결과 등록 알림</li>
          <li>✅ 관리자 승인/거부 알림</li>
          <li>✅ 보고서 생성 완료 알림</li>
        </ul>
      </div>
      <div class="dialog-footer">
        <button class="btn btn-secondary" onclick="this.closest('.notification-permission-dialog').remove()">
          나중에
        </button>
        <button class="btn btn-primary" onclick="enablePushNotifications()">
          알림 받기
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
}

// 푸시 알림 활성화
async function enablePushNotifications() {
  try {
    await window.pushManager.subscribe();
    
    // 성공 메시지 표시
    showNotification('✅ 푸시 알림이 활성화되었습니다!', 'success');
    
    // 다이얼로그 제거
    const dialog = document.querySelector('.notification-permission-dialog');
    if (dialog) {
      dialog.remove();
    }
    
    // UI 업데이트
    updateNotificationUI();
    
  } catch (error) {
    console.error('❌ Failed to enable push notifications:', error);
    showNotification('❌ 푸시 알림 설정에 실패했습니다.', 'error');
  }
}

// 푸시 알림 비활성화
async function disablePushNotifications() {
  try {
    await window.pushManager.unsubscribe();
    showNotification('✅ 푸시 알림이 비활성화되었습니다.', 'info');
    updateNotificationUI();
  } catch (error) {
    console.error('❌ Failed to disable push notifications:', error);
    showNotification('❌ 푸시 알림 비활성화에 실패했습니다.', 'error');
  }
}

// 알림 UI 업데이트
function updateNotificationUI() {
  const status = window.pushManager.getSubscriptionStatus();
  const notificationToggle = document.getElementById('notification-toggle');
  
  if (notificationToggle) {
    notificationToggle.checked = status.isSubscribed;
    notificationToggle.disabled = !status.isSupported;
  }
  
  // 상태 표시 업데이트
  const statusElement = document.getElementById('notification-status');
  if (statusElement) {
    if (!status.isSupported) {
      statusElement.textContent = '지원하지 않음';
      statusElement.className = 'status-unsupported';
    } else if (status.isSubscribed) {
      statusElement.textContent = '활성화됨';
      statusElement.className = 'status-enabled';
    } else {
      statusElement.textContent = '비활성화됨';
      statusElement.className = 'status-disabled';
    }
  }
}

// 테스트 알림 발송
async function sendTestNotification() {
  try {
    await window.pushManager.sendTestNotification();
    showNotification('✅ 테스트 알림을 발송했습니다!', 'success');
  } catch (error) {
    console.error('❌ Test notification failed:', error);
    showNotification('❌ 테스트 알림 발송에 실패했습니다.', 'error');
  }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  // 푸시 알림 지원 여부 확인
  if (window.pushManager.isSupported) {
    console.log('📱 Push notifications supported');
    
    // 권한 상태 확인
    const permission = Notification.permission;
    console.log('🔔 Notification permission:', permission);
    
    if (permission === 'default') {
      // 권한 요청 다이얼로그 표시 (5초 후)
      setTimeout(() => {
        showNotificationPermissionDialog();
      }, 5000);
    }
  } else {
    console.warn('⚠️ Push notifications not supported');
  }
});

console.log('📱 PushManager loaded');
