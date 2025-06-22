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
    // Ensure proper module handling
    modulePreload: {
      polyfill: false
    },
    rollupOptions: {
      // Ensure no external dependencies that could cause module splitting
      external: [],
      output: {
        // Ultra-safe chunking strategy - keep React with everything that might use it
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Three.js ecosystem - keep separate but ensure no React dependencies
            if (id.includes('three') && !id.includes('@react-three') && !id.includes('react')) {
              return 'three-core'
            }
            
            // EVERYTHING else goes with React to prevent any cross-chunk React access
            // This includes @react-three, @radix-ui, lucide-react, and all other UI libs
            return 'react-vendor'
          }
        },
        // Ensure consistent module format
        format: 'es',
        // Prevent hoisting that could cause issues
        hoistTransitiveImports: false,
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
  // Optimize dev server and prevent module issues
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'scheduler',
      'use-sync-external-store',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@radix-ui/react-slot',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'lucide-react'
    ],
    // Force all React-related modules to be pre-bundled together
    force: true
  },
  // Additional configuration to prevent React splitting
  define: {
    // Ensure React is available globally to prevent undefined issues
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  }
})
