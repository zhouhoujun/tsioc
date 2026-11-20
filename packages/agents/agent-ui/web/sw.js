const CACHE_NAME = 'tsdi-agent-shell-v4';
const CACHE_PREFIX = 'tsdi-agent-shell-';
const CORE_ASSETS = [
    './',
    './index.html',
    './console.css',
    './header.js',
    './manifest.webmanifest',
    './icons/agent.svg',
    './dist/agent-console.js'
];
const SHELL_URLS = new Set(CORE_ASSETS.map(asset => new URL(asset, self.registration.scope).href));

/**
 * The console ships as a site (entry + hashed chunks), so the shell list comes
 * from the build's `dist/assets.json` manifest. Falls back to the entry-only
 * list for older builds or when the manifest cannot be read offline.
 */
async function resolveShellAssets() {
    try {
        const response = await fetch('./dist/assets.json', { cache: 'no-store' });
        if (!response.ok) return CORE_ASSETS;
        const manifest = await response.json();
        const built = Array.isArray(manifest && manifest.assets) ? manifest.assets.filter(Boolean) : [];
        return built.length ? Array.from(new Set([...CORE_ASSETS, ...built])) : CORE_ASSETS;
    } catch (error) {
        return CORE_ASSETS;
    }
}

self.addEventListener('install', event => {
    event.waitUntil(resolveShellAssets().then(assets => caches.open(CACHE_NAME).then(cache => cache.addAll(assets))));
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
    // Chunk requests live under /dist/ and are cached network-first as well;
    // the manifest list is only known after install, so the path check keeps
    // lazily imported chunks available offline too.
    if (!SHELL_URLS.has(url.href) && !/\/dist\//.test(url.pathname)) return;
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
