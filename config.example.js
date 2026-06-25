/*
 * TriLink site settings — EXAMPLE / TEMPLATE.
 *
 * Copy this file to `config.js` and edit that copy. `config.js` is gitignored, so
 * your real settings (e.g. your CORS relay URL) stay out of version control.
 *
 *   cp config.example.js config.js
 *
 * This is the one file you edit to configure the site. It loads before everything
 * else, so the values here are ready by the time the other scripts run. No build
 * step — just edit and save.
 */

// Optional CORS relay (see cors-relay/). Leave it blank to stay fully
// no-backend: links still work, and only the in-browser preview and the
// no-TriOS download fallback lose the ability to read .version files from hosts
// that block cross-origin reads (Bitbucket, Dropbox, …).
//
// To turn it on: deploy the Worker in cors-relay/, then paste its URL here, e.g.
//   self.TRILINK_CORS_PROXY = 'https://trilink-cors.your-name.workers.dev';
self.TRILINK_CORS_PROXY = '';
