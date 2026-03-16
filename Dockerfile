FROM node:20-alpine

WORKDIR /app

# 👇 Recibir variables del entorno
ARG VITE_ENVIRONMENT
ARG VITE_API_URL

# 👇 Convertirlas en variables del sistema
ENV VITE_ENVIRONMENT=local
#ENV VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=https://api.inmero.co/sigcon/dev

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]