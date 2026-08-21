// Keep the worker network-only: authenticated business data must never enter Cache Storage.
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') {
    event.respondWith(fetch(event.request));
  }
});
