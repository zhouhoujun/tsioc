const CACHE_NAME = 'tsdi-agent-shell-v1';
const CACHE_PREFIX = 'tsdi-agent-shell-';
const SHELL_ASSETS = [
    './',
    './index.html',
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
    event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
