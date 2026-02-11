import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const base = '/sigcon/'

  return {
    base,
    plugins: [
      react()
    ],
    resolve: {
      alias: {
        jquery: 'jquery'
      }
    },
    optimizeDeps: {
      include: [
        'jquery',
        'datatables.net',
        'datatables.net-bs5',
        'datatables.net-buttons',
        'typeahead.js'
      ]
    }
  }
});

