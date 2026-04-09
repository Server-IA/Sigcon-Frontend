import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {

  const env = {
    ...process.env,
    ...loadEnv(mode, process.cwd())
  };
  console.log('mode', mode);

  return {
    base:
      env.VITE_ENVIRONMENT == 'local'
        ? '/'
        : env.VITE_ENVIRONMENT == 'development'
        ? '/sigcon/dev/' 
        : '/sigcon/',
    plugins: [
      react()
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
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

