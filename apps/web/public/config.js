/*
 * VidyaGram runtime configuration.
 *
 * IMPORTANT: this file is public and shipped to the browser.
 * Never place API keys, client secrets or passwords here.
 *
 * Integrations are disabled until a server-side proxy is deployed.
 * See docs/INTEGRATIONS.md for the expected backend contract.
 */
window.VIDYAGRAM_CONFIG = {
  demoMode: true,
  version: '1.0.0',
  // School API (apps/api). Leave `enabled: false` for a purely on-device demo.
  // In development the Vite dev server proxies `/api` to http://localhost:4000,
  // so the relative default works without CORS. In production point `baseUrl`
  // at the API origin, e.g. 'https://api.yourschool.example/api/v1'.
  api: {
    enabled: true,
    baseUrl: '/api/v1',
    timeoutMs: 8000,
  },
  // Zoom meetings must be created server-side with Server-to-Server OAuth.
  zoom: { configured: false, proxyUrl: '', label: 'Zoom' },
  // AI requests must be proxied so provider keys stay off the client.
  ai: { configured: false, proxyUrl: '', provider: '' },
  // Notification delivery requires an SMS/email gateway.
  email: { configured: false },
  sms: { configured: false },
};
