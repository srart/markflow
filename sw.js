/* MarkFlow Service Worker — offline cache */
const CACHE = 'markflow-v2';
const PRECACHE = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './icon.svg',
  'https://cdn.jsdelivr.net/npm/marked@12/marked.min.js',
  'https://cdn.jsdelivr.net/npm/marked-footnote@1/dist/index.umd.min.js',
  'https://cdn.jsdelivr.net/npm/highlight.js@11/lib/highlight.min.js',
  'https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github.min.css',
  'https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.css',
  'https://cdn.jsdelivr.net/npm/katex@0.16/dist/katex.min.js',
  'https://cdn.jsdelivr.net/npm/katex@0.16/dist/contrib/auto-render.min.js',
  'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res && res.status === 200 && (e.request.url.startsWith('https://cdn.jsdelivr.net') || e.request.url.startsWith('https://esm.sh'))) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
