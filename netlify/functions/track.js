import { hashVisitor } from './lib/hash.js';
import {
  recordPageview,
  recordEngagement,
  recordEvent,
  recordHeartbeat,
  getSite
} from './lib/storage.js';

// Validate origin against registered site domain
function validateOrigin(origin, siteDomain) {
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.hostname.toLowerCase();
    const siteHost = siteDomain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Exact match or www variant
    return originHost === siteHost ||
           originHost === `www.${siteHost}` ||
           `www.${originHost}` === siteHost;
  } catch {
    return false;
  }
}

// Get allowed origin for CORS header
function getAllowedOrigin(origin, siteDomain) {
  if (validateOrigin(origin, siteDomain)) {
    return origin;
  }
  return null;
}

export default async function handler(req, context) {
  const origin = req.headers.get('origin');

  // Handle CORS preflight - allow all origins for preflight
  // Actual validation happens on POST
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await req.json();
    const { type, siteId } = data;

    if (!siteId) {
      return new Response(JSON.stringify({ error: 'Site ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify site exists
    const site = await getSite(siteId);
    if (!site) {
      return new Response(JSON.stringify({ error: 'Invalid site ID' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // CORS origin validation - only allow requests from the registered domain
    const allowedOrigin = getAllowedOrigin(origin, site.domain);
    if (!allowedOrigin && origin) {
      console.log(`CORS blocked: origin=${origin}, expected domain=${site.domain}`);
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'null'
        }
      });
    }

    // Get client IP and user agent
    const ip = context.ip || req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Hash visitor for anonymous tracking
    const visitorHash = hashVisitor(ip, userAgent);

    // Get approximate geolocation from Netlify context
    const geo = context.geo || {};
    const geoData = {
      country: geo.country?.code || null,
      region: geo.subdivision?.code || null,
      city: geo.city || null
    };

    // Handle different event types
    switch (type) {
      case 'pageview':
        await recordPageview(siteId, visitorHash, {
          path: data.path || '/',
          url: data.url,
          title: data.title,
          referrer: data.referrer,
          sessionId: data.sessionId,
          pageCount: data.pageCount,
          landingPage: data.landingPage,
          isNewVisitor: data.isNewVisitor,
          isNewSession: data.isNewSession,
          device: data.device,
          trafficSource: data.trafficSource,
          utm: data.utm,
          geo: geoData
        });
        break;

      case 'engagement':
        await recordEngagement(siteId, visitorHash, {
          sessionId: data.sessionId,
          path: data.path,
          timeOnPage: data.timeOnPage,
          sessionDuration: data.sessionDuration,
          maxScrollDepth: data.maxScrollDepth,
          pageCount: data.pageCount,
          isExitPage: data.isExitPage,
          isBounce: data.isBounce
        });
        break;

      case 'event':
        await recordEvent(siteId, visitorHash, {
          sessionId: data.sessionId,
          category: data.category,
          action: data.action,
          label: data.label,
          value: data.value,
          path: data.path
        });
        break;

      case 'heartbeat':
        await recordHeartbeat(siteId, visitorHash, {
          sessionId: data.sessionId,
          path: data.path
        });
        break;

      default:
        // Legacy support - treat as pageview
        await recordPageview(siteId, visitorHash, {
          path: data.path || '/',
          referrer: data.referrer
        });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin || '*'
      }
    });
  } catch (err) {
    console.error('Track error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const config = {
  path: '/api/track'
};
