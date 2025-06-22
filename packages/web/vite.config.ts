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
  },
  build: {
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Target modern browsers for smaller bundles
    target: 'es2020',
    rollupOptions: {
      output: {
        // More aggressive chunking strategy
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Three.js core - split into smaller chunks
            if (id.includes('three/build/three')) {
              return 'three-core'
            }
            if (id.includes('three/examples/jsm')) {
              return 'three-examples'
            }
            if (id.includes('three') && !id.includes('@react-three')) {
              return 'three-addons'
            }
            
            // React Three ecosystem - more granular splitting
            if (id.includes('@react-three/fiber')) {
              return 'react-three-fiber'
            }
            if (id.includes('@react-three/drei')) {
              // Split drei by functionality
              if (id.includes('controls') || id.includes('Controls')) {
                return 'react-three-controls'
              }
              if (id.includes('helpers') || id.includes('Helpers')) {
                return 'react-three-helpers'
              }
              if (id.includes('loaders') || id.includes('Loaders')) {
                return 'react-three-loaders'
              }
              if (id.includes('materials') || id.includes('Materials')) {
                return 'react-three-materials'
              }
              return 'react-three-utils'
            }
            
            // React ecosystem
            if (id.includes('react/') || id.includes('react-dom/')) {
              return 'react-core'
            }
            if (id.includes('scheduler')) {
              return 'react-scheduler'
            }
            
            // UI Libraries - split by size
            if (id.includes('@radix-ui')) {
              // Group smaller radix components together
              if (id.includes('dialog') || id.includes('dropdown') || id.includes('navigation')) {
                return 'radix-ui-complex'
              }
              return 'radix-ui-simple'
            }
            
            // Animation and gesture libraries
            if (id.includes('@use-gesture') || id.includes('motion') || id.includes('framer')) {
              return 'animation-libs'
            }
            
            // Utility libraries by size
            if (id.includes('lodash') || id.includes('ramda') || id.includes('immutable')) {
              return 'utils-heavy'
            }
            if (id.includes('clsx') || id.includes('class-variance-authority') || 
                id.includes('tailwind-merge')) {
              return 'utils-styling'
            }
            if (id.includes('lucide-react')) {
              return 'icons'
            }
            
            // Math and 3D utilities
            if (id.includes('gl-matrix') || id.includes('cannon') || id.includes('ammo')) {
              return 'math-physics'
            }
            
            // Everything else - try to group by package size
            const packageName = id.split('node_modules/')[1]?.split('/')[0]
            if (packageName) {
              // Group smaller packages together
              const smallPackages = ['tiny-invariant', 'use-sync-external-store', 'detect-gpu']
              if (smallPackages.some(pkg => packageName.includes(pkg))) {
                return 'vendor-small'
              }
            }
            
            return 'vendor-misc'
          }
        },
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
      'three',
      '@react-three/fiber',
      '@react-three/drei'
    ],
    exclude: ['lucide-react']
  }
})
