# ---------- Build ----------
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---------- Nginx ----------
FROM nginx:alpine

# Limpiar config default
RUN rm /etc/nginx/conf.d/default.conf

# Copiar build de Vite
COPY --from=build /app/dist /usr/share/nginx/html

# Config SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
