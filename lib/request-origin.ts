// Next may use an internal hostname in request.url behind its server/proxy.
// The HTTP Host header identifies the app the browser actually requested.
export function hasSameOrigin(request: Request, requireOrigin = false) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  if (!origin) return !requireOrigin;
  try {
    const supplied = new URL(origin);
    const host = request.headers.get('host') || new URL(request.url).host;
    return ['http:', 'https:'].includes(supplied.protocol)
      && supplied.origin === origin && supplied.host.toLowerCase() === host.toLowerCase();
  } catch { return false; }
}
