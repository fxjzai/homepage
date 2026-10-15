// Static assets only. scripts/build-cloudflare.mjs preserves the prerendered HTML.
export default {
  worker: {
    name: 'fxjzai-homepage',
    compatibilityDate: '2026-10-15',
    workersDev: true,
    domains: ['fxjzai.com'],
    assets: {
      htmlHandling: 'drop-trailing-slash',
      notFoundHandling: '404-page',
    },
    env: {},
  },
};
