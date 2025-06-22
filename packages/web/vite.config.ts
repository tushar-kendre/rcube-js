import tailwindcss from "@tailwindcss/vite"
import react from '@vitejs/plugin-react'
import { resolve } from "path"
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Set base path for GitHub Pages deployment
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react({
      // Ensure React is handled consistently
      jsxRuntime: 'automatic',
      // Enable React optimization
      babel: {
        plugins: [
          // Remove development-only code in production
          ['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }]
        ]
      }
    }),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
    // Ensure consistent module resolution
    dedupe: ['react', 'react-dom', 'three']
  },
  build: {
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Target modern browsers for smaller bundles
    target: 'es2020',
    rollupOptions: {
      // No manual chunking - let Vite handle it automatically
      output: {
        // Optimize chunk names and hashing
        chunkFileNames: () => {
          return `assets/[name]-[hash].js`
        },
        assetFileNames: (assetInfo) => {
          // Organize assets by type
          const name = assetInfo.name || 'asset'
          if (/\.(css)$/.test(name)) {
            return `assets/css/[name]-[hash][extname]`
          }
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(name)) {
            return `assets/images/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        }
      }
    },
    // Increase chunk size warning (Three.js will always be large)
    chunkSizeWarningLimit: 1000,
    // Use esbuild for fast builds
    minify: 'esbuild',
    // Enable source maps for debugging
    sourcemap: false,
    // Optimize dependencies
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  // Optimize dev server
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'three',
      '@react-three/fiber',
      '@react-three/drei'
    ]
  }
})
