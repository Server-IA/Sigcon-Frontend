# ===== Build =====
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ===== Production =====
FROM nginx:alpine

# Borra config default
RUN rm /etc/nginx/conf.d/default.conf

# Copia tu config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia build de Vite
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
