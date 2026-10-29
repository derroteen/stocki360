// Keep the worker network-only: authenticated business data must never enter Cache Storage.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isVideoRequest = url.pathname.startsWith('/video/');
  const isRangeRequest = event.request.headers.has('range');

  if (event.request.method === 'GET' && !isVideoRequest && !isRangeRequest) {
    event.respondWith(fetch(event.request));
  }
});
