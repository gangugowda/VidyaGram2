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
  // Zoom meetings must be created server-side with Server-to-Server OAuth.
  zoom: { configured: false, proxyUrl: '', label: 'Zoom' },
  // AI requests must be proxied so provider keys stay off the client.
  ai: { configured: false, proxyUrl: '', provider: '' },
  // Notification delivery requires an SMS/email gateway.
  email: { configured: false },
  sms: { configured: false },
};
