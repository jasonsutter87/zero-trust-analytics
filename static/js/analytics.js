(function() {
  'use strict';

  // Zero Trust Analytics - Privacy-focused tracking
  var ZTA = window.ZTA || {};

  // Configuration
  ZTA.config = {
    endpoint: null,
    siteId: null,
    debug: false
  };

  // Initialize with site ID
  ZTA.init = function(siteId, options) {
    options = options || {};
    ZTA.config.siteId = siteId;
    ZTA.config.endpoint = options.endpoint || 'https://zero-trust-analytics.netlify.app/api/track';
    ZTA.config.debug = options.debug || false;

    // Auto-track page view on init
    if (options.autoTrack !== false) {
      ZTA.trackPageView();
    }

    // Track on navigation (SPA support)
    if (options.spa) {
      ZTA.setupSPATracking();
    }

    ZTA.log('Initialized with site ID:', siteId);
  };

  // Track a page view
  ZTA.trackPageView = function(customData) {
    var data = {
      type: 'pageview',
      siteId: ZTA.config.siteId,
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || null,
      title: document.title,
      timestamp: new Date().toISOString(),
      screen: {
        width: window.screen.width,
        height: window.screen.height
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };

    // Merge custom data
    if (customData) {
      for (var key in customData) {
        data[key] = customData[key];
      }
    }

    ZTA.send(data);
  };

  // Track custom events
  ZTA.trackEvent = function(eventName, eventData) {
    var data = {
      type: 'event',
      siteId: ZTA.config.siteId,
      event: eventName,
      data: eventData || {},
      url: window.location.href,
      path: window.location.pathname,
      timestamp: new Date().toISOString()
    };

    ZTA.send(data);
  };

  // Send data to server
  ZTA.send = function(data) {
    if (!ZTA.config.siteId) {
      ZTA.log('Error: Site ID not set');
      return;
    }

    // Use sendBeacon for reliability (works even on page unload)
    if (navigator.sendBeacon) {
      var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      var sent = navigator.sendBeacon(ZTA.config.endpoint, blob);
      ZTA.log('Sent via beacon:', sent, data);
    } else {
      // Fallback to fetch
      fetch(ZTA.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        keepalive: true
      }).then(function() {
        ZTA.log('Sent via fetch:', data);
      }).catch(function(err) {
        ZTA.log('Send error:', err);
      });
    }
  };

  // SPA tracking setup
  ZTA.setupSPATracking = function() {
    // Track pushState
    var originalPushState = history.pushState;
    history.pushState = function() {
      originalPushState.apply(history, arguments);
      ZTA.trackPageView();
    };

    // Track popstate (back/forward)
    window.addEventListener('popstate', function() {
      ZTA.trackPageView();
    });

    ZTA.log('SPA tracking enabled');
  };

  // Debug logging
  ZTA.log = function() {
    if (ZTA.config.debug && console && console.log) {
      console.log.apply(console, ['[ZTA]'].concat(Array.prototype.slice.call(arguments)));
    }
  };

  // Expose globally
  window.ZTA = ZTA;

  // Auto-init if data attributes present
  var script = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  if (script) {
    var siteId = script.getAttribute('data-site-id');
    var autoTrack = script.getAttribute('data-auto-track') !== 'false';
    var spa = script.getAttribute('data-spa') === 'true';
    var debug = script.getAttribute('data-debug') === 'true';

    if (siteId) {
      ZTA.init(siteId, {
        autoTrack: autoTrack,
        spa: spa,
        debug: debug
      });
    }
  }
})();
