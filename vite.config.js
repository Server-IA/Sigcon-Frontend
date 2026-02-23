import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

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
        ? '/dev/sigcon/' 
        : '/sigcon/',
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

