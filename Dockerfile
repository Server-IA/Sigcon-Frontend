FROM node:20-alpine

WORKDIR /app

# 👇 Convertirlas en variables del sistema
ENV VITE_ENVIRONMENT=local
ENV VITE_API_URL_LOCAL=https://api.inmero.co/sigcon/
ENV VITE_API_URL_DEVELOPMENT=https://api.inmero.co/dev/sigcon/
ENV VITE_API_URL_PRODUCTION=https://api.inmero.co/sigcon/

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
