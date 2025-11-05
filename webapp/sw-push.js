// Enhanced Service Worker with Push Notifications
const CACHE_NAME = 'insighti-v3.0';
const ASSETS = [
  '/index.html',
  '/css/style.css',
  '/js/data.js',
  '/js/api.js',
  '/js/ai-detector.js',
  '/js/app.js',
  '/js/push-manager.js'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Caching assets...');
      return cache.addAll(ASSETS);
    }).then(() => {
      console.log('✅ Service Worker installed');
      return self.skipWaiting();
    })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => {
          console.log('🗑️ Deleting old cache:', k);
          return caches.delete(k);
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  
  const url = new URL(request.url);
  
  // External API requests pass through
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        console.log('📦 Serving from cache:', request.url);
        return cached;
      }
      
      console.log('🌐 Fetching from network:', request.url);
      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Push event - 핵심 푸시 알림 처리
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received:', event);
  
  let notificationData = {
    title: 'InsightI 알림',
    body: '새로운 알림이 있습니다.',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'insighti-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: '확인',
        icon: '/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: '닫기',
        icon: '/icon-192x192.png'
      }
    ]
  };
  
  // 서버에서 전송된 데이터가 있으면 사용
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData,
        data: pushData.data || {}
      };
    } catch (error) {
      console.error('❌ Error parsing push data:', error);
    }
  }
  
  console.log('🔔 Showing notification:', notificationData);
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    console.log('❌ Notification dismissed');
    return;
  }
  
  // 앱으로 포커스 또는 새 창 열기
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // 이미 열린 창이 있으면 포커스
      for (const client of clientList) {
        if (client.url === self.location.origin && 'focus' in client) {
          console.log('🎯 Focusing existing window');
          return client.focus();
        }
      }
      
      // 새 창 열기
      if (clients.openWindow) {
        console.log('🆕 Opening new window');
        return clients.openWindow('/');
      }
    })
  );
});

// Background sync (오프라인 지원)
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'defect-sync') {
    event.waitUntil(syncDefects());
  } else if (event.tag === 'inspection-sync') {
    event.waitUntil(syncInspections());
  }
});

// 오프라인 데이터 동기화
async function syncDefects() {
  console.log('🔄 Syncing defects...');
  try {
    // IndexedDB에서 대기 중인 하자 데이터 가져오기
    const pendingDefects = await getPendingDefects();
    
    for (const defect of pendingDefects) {
      try {
        await fetch('/api/defects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(defect)
        });
        
        // 성공 시 로컬 데이터 삭제
        await removePendingDefect(defect.id);
        console.log('✅ Synced defect:', defect.id);
      } catch (error) {
        console.error('❌ Failed to sync defect:', defect.id, error);
      }
    }
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

async function syncInspections() {
  console.log('🔄 Syncing inspections...');
  // 점검 데이터 동기화 로직
}

// IndexedDB 헬퍼 함수들
async function getPendingDefects() {
  // IndexedDB에서 대기 중인 하자 데이터 조회
  return [];
}

async function removePendingDefect(id) {
  // IndexedDB에서 동기화 완료된 하자 데이터 삭제
  console.log('🗑️ Removed pending defect:', id);
}

console.log('📱 Service Worker loaded with push notifications');
