(function () {
  'use strict';

  const state = {
    client: null,
    config: null,
    error: null,
    enabled: false
  };

  function usable(config) {
    return !!(config && config.url && (config.publishableKey || config.anonKey)
      && !String(config.url).includes('YOUR_PROJECT_ID')
      && !String(config.publishableKey || config.anonKey).includes('YOUR_SUPABASE'));
  }

  async function loadConfig() {
    if (usable(window.SUPABASE_CONFIG)) return window.SUPABASE_CONFIG;
    if (location.protocol === 'file:') return null;

    try {
      const res = await fetch('/api/config', { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      const body = await res.json();
      return body && body.ok ? body : null;
    } catch (err) {
      return null;
    }
  }

  async function init() {
    if (!window.supabase) {
      state.error = 'Supabase CDN not loaded';
      return null;
    }

    const config = await loadConfig();
    if (!usable(config)) return null;

    state.config = config;
    state.client = window.supabase.createClient(config.url, config.publishableKey || config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    state.enabled = true;
    return state.client;
  }

  state.ready = init();

  window.AbilitySupabase = {
    get client() { return state.client; },
    get config() { return state.config; },
    get enabled() { return state.enabled; },
    get error() { return state.error; },
    ready: state.ready
  };
}());
