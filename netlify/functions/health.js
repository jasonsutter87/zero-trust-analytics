export default async function handler(req, context) {
  const startTime = Date.now();

  // Basic health check response
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime ? Math.round(process.uptime()) : null,
    version: '1.0.0',
    checks: {
      api: 'ok'
    }
  };

  // Calculate response time
  health.responseTime = Date.now() - startTime;

  return new Response(JSON.stringify(health), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

export const config = {
  path: '/api/health'
};
