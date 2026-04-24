/**
 * Lightweight Sentry capture for Vercel serverless functions.
 *
 * No SDK dependency — POSTs directly to the Sentry envelope endpoint.
 * The DSN is a public identifier by design (Sentry auth is per-project,
 * not per-key), so reusing REACT_APP_SENTRY_DSN server-side is fine.
 *
 * If the DSN is missing or the request fails, capture is a no-op so
 * error tracking never crashes a request path.
 */

function parseDsn(dsn) {
  const m = /^https:\/\/([^@]+)@([^/]+)\/(.+)$/.exec(dsn || '');
  if (!m) return null;
  return { publicKey: m[1], host: m[2], projectId: m[3] };
}

async function captureException(err, context = {}) {
  const dsn = process.env.SENTRY_DSN || process.env.REACT_APP_SENTRY_DSN;
  const parsed = parseDsn(dsn);
  if (!parsed) return;

  const { publicKey, host, projectId } = parsed;
  const eventId = (Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2)).slice(0, 32);
  const timestamp = Math.floor(Date.now() / 1000);

  const event = {
    event_id: eventId,
    timestamp,
    platform: 'node',
    level: 'error',
    server_name: 'vercel-serverless',
    logger: context.logger || 'api',
    environment: process.env.VERCEL_ENV || 'production',
    release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
    tags: { ...context.tags },
    extra: { ...context.extra },
    exception: {
      values: [
        {
          type: (err && err.name) || 'Error',
          value: (err && err.message) || String(err),
          stacktrace: err && err.stack
            ? {
                frames: err.stack
                  .split('\n')
                  .slice(1, 20)
                  .map((line) => ({ filename: line.trim(), in_app: true })),
              }
            : undefined,
        },
      ],
    },
  };

  const envelope =
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }) +
    '\n' +
    JSON.stringify({ type: 'event' }) +
    '\n' +
    JSON.stringify(event);

  try {
    await fetch(`https://${host}/api/${projectId}/envelope/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7,sentry_key=${publicKey},sentry_client=rb-perform-serverless/1.0`,
      },
      body: envelope,
    });
  } catch {
    // Never let Sentry failure affect the request path.
  }
}

module.exports = { captureException };
