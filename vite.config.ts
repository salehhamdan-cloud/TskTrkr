import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  const base = process.env.GITHUB_PAGES_BASE || './';
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'pwa-register-sw-middleware',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && (req.url === '/registerSW.js' || req.url.startsWith('/registerSW.js?'))) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
              res.setHeader('Cache-Control', 'no-store');
              res.end(
                "if('serviceWorker' in navigator) { navigator.serviceWorker.register('/dev-sw.js?dev-sw', { scope: '/', type: 'classic' }); }\n"
              );
              return;
            }
            next();
          });
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'inline',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'assets/images/task_photo_wireframe_board_1794335934785.jpg',
          'assets/images/task_photo_hardware_prototype_1794335934786.jpg',
        ],
        manifest: {
          id: './',
          name: 'Task Tracker — Offline Project & Task Manager',
          short_name: 'TaskTracker',
          description: 'Cross-platform offline project & task workspace with checklists, sub-todos, photo annotations, and PDF export.',
          theme_color: '#2563EB',
          background_color: '#0F172A',
          display: 'standalone',
          start_url: './',
          scope: './',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
          suppressWarnings: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
