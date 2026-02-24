# Build
FROM node:20-alpine AS build
WORKDIR /app
<<<<<<< Updated upstream
=======

# 👇 Convertirlas en variables del sistema
ENV VITE_ENVIRONMENT=local
ENV VITE_API_URL_LOCAL=https://api.inmero.co/sigcon/dev
ENV VITE_API_URL_DEVELOPMENT=https://api.inmero.co/dev/sigcon/
ENV VITE_API_URL_PRODUCTION=https://api.inmero.co/sigcon/

>>>>>>> Stashed changes
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
