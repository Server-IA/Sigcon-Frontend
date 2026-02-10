# Build
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_BASE_PATH=/sigcon/
ARG VITE_APP_ENV=production

ENV VITE_BASE_PATH=${VITE_BASE_PATH}
ENV VITE_APP_ENV=${VITE_APP_ENV}

RUN npm run build

# Serve
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
