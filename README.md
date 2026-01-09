# Frontend React – Arquitectura Hexagonal

Proyecto frontend desarrollado con **React + Vite**, estructurado bajo **arquitectura hexagonal (Ports & Adapters)** y dockerizado para facilitar su instalación, ejecución y despliegue.

---

## 📌 Tecnologías utilizadas

- React
- Vite
- TypeScript
- Docker
- Docker Compose
- Nginx (producción)

---

---

## 🧾 Requisitos previos

- Git
- Docker Desktop (en modo **Linux containers**)

> ⚠️ No es necesario tener Node instalado localmente.

---

## 📥 Instalación del proyecto

### 1️⃣ Clonar el repositorio

```bash
- git clone git remote add origin https://github.com/WilliamsBD8/sigcon-frontend.git
- cd frontend

### 2️⃣ Levantar el proyecto (modo desarrollo)
docker compose up --build frontend-dev

### 3️⃣ Levantar el proyecto (modo producción)
docker compose up --build frontend-prod

### 🛑 Detener los contenedores
docker compose down