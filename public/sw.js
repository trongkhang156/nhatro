const CACHE_NAME = 'nhatro-v1';
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  // Thêm đường dẫn tới các icon nếu có
  '/icons/icon-192x192.png', 
  '/icons/icon-512x512.png'
];

// Sự kiện cài đặt Service Worker (caching tài nguyên)
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching all: app shell and content');
        return cache.addAll(urlsToCache);
      })
  );
});

// Sự kiện kích hoạt (dọn dẹp cache cũ)
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          return cacheName.startsWith('nhatro-') && cacheName !== CACHE_NAME;
        }).map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
  return self.clients.claim();
});

// Sự kiện tìm nạp (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Chiến lược: Cache-First cho tài nguyên tĩnh
  if (urlsToCache.includes(url.pathname) || url.origin === 'https://cdn.tailwindcss.com') {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Trả về từ cache nếu có, hoặc fetch từ network
          return response || fetch(event.request);
        })
    );
    return;
  }
  
  // Chiến lược: Network-First cho API
  if (url.origin === 'https://nhatro-mi7x.onrender.com' || url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Fallback: nếu API không thể truy cập, cố gắng tìm kết quả từ cache
        return caches.match(event.request);
      })
    );
    return;
  }
  
  // Mặc định: Network-First
  event.respondWith(
    fetch(event.request).catch(() => {
        // Tùy chọn: trả về một trang offline nếu lỗi
        // return caches.match('/offline.html');
        // Ở đây, ta chỉ báo lỗi mạng
        throw new Error('Network error');
    })
  );
});
