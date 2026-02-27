// vite.config.js
import { defineConfig, loadEnv } from "file:///app/node_modules/vite/dist/node/index.js";
import react from "file:///app/node_modules/@vitejs/plugin-react-swc/index.js";
var vite_config_default = defineConfig(({ mode }) => {
  const env = {
    ...process.env,
    ...loadEnv(mode, process.cwd())
  };
  console.log("mode", mode);
  return {
    base: env.VITE_ENVIRONMENT == "local" ? "/" : env.VITE_ENVIRONMENT == "development" ? "/dev/sigcon/" : "/sigcon/",
    plugins: [
      react()
    ],
    resolve: {
      alias: {
        jquery: "jquery"
      }
    },
    optimizeDeps: {
      include: [
        "jquery",
        "datatables.net",
        "datatables.net-bs5",
        "datatables.net-buttons",
        "typeahead.js"
      ]
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvYXBwL3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9hcHAvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJ1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djJ1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcclxuXHJcbiAgY29uc3QgZW52ID0ge1xyXG4gICAgLi4ucHJvY2Vzcy5lbnYsXHJcbiAgICAuLi5sb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCkpXHJcbiAgfTtcclxuICBjb25zb2xlLmxvZygnbW9kZScsIG1vZGUpO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgYmFzZTpcclxuICAgICAgZW52LlZJVEVfRU5WSVJPTk1FTlQgPT0gJ2xvY2FsJ1xyXG4gICAgICAgID8gJy8nXHJcbiAgICAgICAgOiBlbnYuVklURV9FTlZJUk9OTUVOVCA9PSAnZGV2ZWxvcG1lbnQnXHJcbiAgICAgICAgPyAnL2Rldi9zaWdjb24vJyBcclxuICAgICAgICA6ICcvc2lnY29uLycsXHJcbiAgICBwbHVnaW5zOiBbXHJcbiAgICAgIHJlYWN0KClcclxuICAgIF0sXHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgIGFsaWFzOiB7XHJcbiAgICAgICAganF1ZXJ5OiAnanF1ZXJ5J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgb3B0aW1pemVEZXBzOiB7XHJcbiAgICAgIGluY2x1ZGU6IFtcclxuICAgICAgICAnanF1ZXJ5JyxcclxuICAgICAgICAnZGF0YXRhYmxlcy5uZXQnLFxyXG4gICAgICAgICdkYXRhdGFibGVzLm5ldC1iczUnLFxyXG4gICAgICAgICdkYXRhdGFibGVzLm5ldC1idXR0b25zJyxcclxuICAgICAgICAndHlwZWFoZWFkLmpzJ1xyXG4gICAgICBdXHJcbiAgICB9XHJcbiAgfVxyXG59KTtcclxuXHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBOEwsU0FBUyxjQUFjLGVBQWU7QUFDcE8sT0FBTyxXQUFXO0FBR2xCLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBRXhDLFFBQU0sTUFBTTtBQUFBLElBQ1YsR0FBRyxRQUFRO0FBQUEsSUFDWCxHQUFHLFFBQVEsTUFBTSxRQUFRLElBQUksQ0FBQztBQUFBLEVBQ2hDO0FBQ0EsVUFBUSxJQUFJLFFBQVEsSUFBSTtBQUV4QixTQUFPO0FBQUEsSUFDTCxNQUNFLElBQUksb0JBQW9CLFVBQ3BCLE1BQ0EsSUFBSSxvQkFBb0IsZ0JBQ3hCLGlCQUNBO0FBQUEsSUFDTixTQUFTO0FBQUEsTUFDUCxNQUFNO0FBQUEsSUFDUjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxjQUFjO0FBQUEsTUFDWixTQUFTO0FBQUEsUUFDUDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
