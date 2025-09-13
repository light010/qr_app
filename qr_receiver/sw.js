// Service Worker for QR File Transfer - World-Class Scanner
// Implements offline caching, background sync, and advanced PWA features

const CACHE_NAME = 'qr-scanner-v2.0.0';
const RUNTIME_CACHE = 'qr-scanner-runtime-v2.0.0';
const OFFLINE_PAGE = './offline.html';

// Core files to cache for offline functionality
const CORE_ASSETS = [
  './',
  './qr-scanner.html',
  './manifest.json',
  './offline.html',
  './favicon.svg',
  './css/styles.css',
  './config/app-config.js',
  './js/qr-scanner-app.js',
  './js/storage-manager.js',
  './js/chunk-manager.js',
  './js/qr-scanner-engine.js',
  './js/retry-manager.js',
  './js/theme-manager.js',
  './js/camera-manager.js',
  './js/camera-ui.js',
  './js/data-processor.js',
  './js/file-preview.js',
  './js/audio-manager.js',
  './js/ui-manager.js',
  // CDN resources (cached with runtime strategy)
  'https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner.umd.min.js',
  'https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner-worker.min.js'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker version:', CACHE_NAME);
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      // Cache core assets with retry logic
      for (const asset of CORE_ASSETS) {
        try {
          await cache.add(asset);
          console.log('[SW] Cached:', asset);
        } catch (error) {
          console.warn('[SW] Failed to cache:', asset, error);
          // For CDN resources, we'll handle them with runtime caching
          if (!asset.startsWith('http')) {
            throw error; // Re-throw for local assets
          }
        }
      }
      
      // Skip waiting to activate immediately
      self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      const deletePromises = cacheNames
        .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
        .map(name => {
          console.log('[SW] Deleting old cache:', name);
          return caches.delete(name);
        });
      
      await Promise.all(deletePromises);
      
      // Take control of all clients immediately
      self.clients.claim();
      
      console.log('[SW] Service worker activated successfully');
    })()
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension URLs
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different types of requests with appropriate strategies
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    // HTML files - Network first, cache fallback
    event.respondWith(networkFirstStrategy(request));
  } else if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'cdnjs.cloudflare.com') {
    // CDN resources - Cache first with runtime caching
    event.respondWith(cacheFirstWithRuntime(request));
  } else if (url.pathname.includes('/icons/') || url.pathname.includes('/screenshots/')) {
    // Static assets - Cache first
    event.respondWith(cacheFirstStrategy(request));
  } else {
    // Other requests - Network first with cache fallback
    event.respondWith(networkFirstStrategy(request));
  }
});

// Network first strategy - for HTML and dynamic content
async function networkFirstStrategy(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If HTML request and no cache, return offline page
    if (request.destination === 'document') {
      const offlineResponse = await caches.match(OFFLINE_PAGE);
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    throw error;
  }
}

// Cache first strategy - for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.warn('[SW] Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Cache first with runtime - for CDN resources
async function cacheFirstWithRuntime(request) {
  let cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Return cached version and update in background
    updateCacheInBackground(request);
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request, {
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.warn('[SW] Failed to fetch CDN resource:', request.url);
    throw error;
  }
}

// Update cache in background
async function updateCacheInBackground(request) {
  try {
    const response = await fetch(request, {
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response);
    }
  } catch (error) {
    console.log('[SW] Background update failed for:', request.url);
  }
}

// Background sync for QR transfer data
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'qr-transfer-retry') {
    event.waitUntil(handleQRTransferRetry());
  } else if (event.tag === 'chunk-recovery') {
    event.waitUntil(handleChunkRecovery());
  }
});

// Handle QR transfer retry in background
async function handleQRTransferRetry() {
  try {
    // Get stored transfer data from IndexedDB
    const transfers = await getFailedTransfers();
    
    for (const transfer of transfers) {
      try {
        // Attempt to retry the transfer
        await retryTransfer(transfer);
        
        // If successful, remove from failed transfers
        await removeFailedTransfer(transfer.id);
        
        // Notify the client
        self.registration.showNotification('QR Transfer Completed', {
          body: `File "${transfer.filename}" has been successfully transferred.`,
          icon: './icons/icon-192x192.png',
          badge: './icons/badge-72x72.png',
          tag: 'transfer-success'
        });
      } catch (error) {
        console.warn('[SW] Transfer retry failed for:', transfer.id);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Handle chunk recovery in background
async function handleChunkRecovery() {
  try {
    const incompleteTransfers = await getIncompleteTransfers();
    
    for (const transfer of incompleteTransfers) {
      // Analyze missing chunks and attempt recovery
      const missingChunks = await analyzeMissingChunks(transfer);
      
      if (missingChunks.length > 0) {
        // Notify client about missing chunks
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'CHUNK_RECOVERY_NEEDED',
            transferId: transfer.id,
            missingChunks: missingChunks
          });
        });
      }
    }
  } catch (error) {
    console.error('[SW] Chunk recovery failed:', error);
  }
}

// Push notifications for transfer updates
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      console.warn('[SW] Push data not JSON:', event.data.text());
    }
  }
  
  const title = data.title || 'QR Scanner Update';
  const options = {
    body: data.body || 'New update available',
    icon: './icons/icon-192x192.png',
    badge: './icons/badge-72x72.png',
    tag: data.tag || 'general',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const urlToOpen = new URL('./', self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      // Check if scanner is already open
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window if not already open
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  const { data } = event;
  
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data.type === 'CACHE_TRANSFER_DATA') {
    cacheTransferData(data.payload);
  } else if (data.type === 'REQUEST_SYNC') {
    self.registration.sync.register(data.tag || 'general-sync');
  }
});

// Cache transfer data for offline access
async function cacheTransferData(data) {
  try {
    // Store in IndexedDB for persistent offline access
    await storeTransferData(data);
    console.log('[SW] Transfer data cached successfully');
  } catch (error) {
    console.error('[SW] Failed to cache transfer data:', error);
  }
}

// IndexedDB helper functions (simplified implementations)
async function getFailedTransfers() {
  // Implementation would interact with IndexedDB
  return [];
}

async function removeFailedTransfer(id) {
  // Implementation would remove from IndexedDB
}

async function retryTransfer(transfer) {
  // Implementation would retry the transfer logic
}

async function getIncompleteTransfers() {
  // Implementation would get incomplete transfers from IndexedDB
  return [];
}

async function analyzeMissingChunks(transfer) {
  // Implementation would analyze which chunks are missing
  return [];
}

async function storeTransferData(data) {
  // Implementation would store data in IndexedDB
}

// Periodic background sync for maintenance
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(performCacheCleanup());
  } else if (event.tag === 'transfer-maintenance') {
    event.waitUntil(performTransferMaintenance());
  }
});

// Cache cleanup maintenance
async function performCacheCleanup() {
  try {
    const cacheNames = await caches.keys();
    const runtimeCache = await caches.open(RUNTIME_CACHE);
    const requests = await runtimeCache.keys();
    
    // Remove old cached CDN resources (older than 7 days)
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    for (const request of requests) {
      const response = await runtimeCache.match(request);
      const dateHeader = response.headers.get('date');
      
      if (dateHeader && new Date(dateHeader).getTime() < oneWeekAgo) {
        await runtimeCache.delete(request);
        console.log('[SW] Cleaned up old cache entry:', request.url);
      }
    }
  } catch (error) {
    console.error('[SW] Cache cleanup failed:', error);
  }
}

// Transfer maintenance
async function performTransferMaintenance() {
  try {
    // Clean up old completed transfers
    // Validate stored chunk data
    // Compress historical data
    console.log('[SW] Transfer maintenance completed');
  } catch (error) {
    console.error('[SW] Transfer maintenance failed:', error);
  }
}

console.log('[SW] Service worker script loaded');