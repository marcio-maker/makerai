/* MakerAI — Service Worker (PWA / cache básico) */
const CACHE_VERSION = 'makerai-pwa-v1';

function coreUrls(scopeUrl) {
    const base = scopeUrl.endsWith('/') ? scopeUrl : scopeUrl + '/';
    return [
        base + 'hairproduto.html',
        base + 'manifest.json',
        base + 'makerai-pwa-icon.svg'
    ];
}

self.addEventListener('install', (event) => {
    const urls = coreUrls(self.registration.scope);
    event.waitUntil(
        caches.open(CACHE_VERSION).then(async (cache) => {
            for (const url of urls) {
                try {
                    await cache.add(new Request(url, { cache: 'reload' }));
                } catch (e) {
                    console.warn('[SW] precache ignorado:', url, e);
                }
            }
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((k) => k !== CACHE_VERSION)
                    .map((k) => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response && response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
                    }
                    return response;
                })
                .catch(() =>
                    caches.match(event.request).then(
                        (cached) =>
                            cached ||
                            caches.match(new URL('hairproduto.html', self.registration.scope).href)
                    )
                )
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) =>
            fetch(event.request)
                .then((response) => {
                    if (response && response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
                    }
                    return response;
                })
                .catch(() => cached)
        )
    );
});