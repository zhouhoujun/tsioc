const CACHE_NAME = 'tsdi-agent-shell-v3';
const CACHE_PREFIX = 'tsdi-agent-shell-';
const SHELL_ASSETS = [
    './',
    './index.html',
    './console.css',
    './header.js',
    './manifest.webmanifest',
    './icons/agent.svg',
    './dist/agent-console.js'
];
const SHELL_URLS = new Set(SHELL_ASSETS.map(asset => new URL(asset, self.registration.scope).href));

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(
        keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key))
    )));
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);

    if (request.mode === 'navigate') {
        event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
        return;
    }
    if (!SHELL_URLS.has(url.href)) return;
    // Network-first: a CLI upgrade must reach the browser. A cache-first shell
    // pinned the old console forever (the browser only reruns `install` when
    // this file changes), so the cached copy is now just the offline fallback.
    event.respondWith(fetch(request).then(response => {
        if (response && response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)));
        }
        return response;
    }).catch(() => caches.match(request)));
});
