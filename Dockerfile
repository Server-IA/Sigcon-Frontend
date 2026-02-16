# Build
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_ENVIRONMENT
ARG VITE_PATH
ARG VITE_API_URL_PRODUCTION

ENV VITE_ENVIRONMENT=$VITE_ENVIRONMENT
ENV VITE_PATH=$VITE_PATH
ENV VITE_API_URL_PRODUCTION=$VITE_API_URL_PRODUCTION

RUN npm run build

# Serve
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
