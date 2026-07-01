(function () {
  'use strict';

  const state = {
    app: null,
    auth: null,
    db: null,
    config: null,
    error: null,
    enabled: false
  };
  const SDK_URL = 'https://static.cloudbase.net/cloudbase-js-sdk/latest/cloudbase.full.js';

  function usable(config) {
    return !!(config && config.env && config.accessKey
      && !String(config.env).includes('YOUR_FULL_CLOUDBASE_ENV_ID')
      && !String(config.accessKey).includes('YOUR_CLOUDBASE'));
  }

  function loadSDK() {
    if (window.cloudbase) return Promise.resolve(window.cloudbase);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => {
        script.remove();
        reject(new Error('CloudBase SDK load timeout'));
      }, 8000);
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => {
        clearTimeout(timer);
        resolve(window.cloudbase);
      };
      script.onerror = () => {
        clearTimeout(timer);
        reject(new Error('CloudBase SDK failed to load'));
      };
      document.head.appendChild(script);
    });
  }

  async function init() {
    const config = window.CLOUDBASE_CONFIG || {};
    if (!usable(config)) return null;

    try {
      await loadSDK();
    } catch (err) {
      state.error = err.message;
      return null;
    }

    state.config = {
      env: config.env,
      region: config.region || 'ap-shanghai',
      accessKey: config.accessKey
    };

    state.app = window.cloudbase.init({
      env: state.config.env,
      region: state.config.region,
      accessKey: state.config.accessKey,
      auth: { detectSessionInUrl: true }
    });
    state.auth = state.app.auth({ persistence: 'local' });
    state.db = state.app.database();
    state.enabled = true;
    return state.app;
  }

  state.ready = init();

  window.AbilityCloudBase = {
    get app() { return state.app; },
    get auth() { return state.auth; },
    get db() { return state.db; },
    get config() { return state.config; },
    get enabled() { return state.enabled; },
    get error() { return state.error; },
    ready: state.ready
  };
}());
