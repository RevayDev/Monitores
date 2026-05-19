# MONITORES

Plataforma para gestion de monitorias academicas con frontend React y backend Node/Express.

## Requisitos
- Node.js 20+
- npm 10+
- MySQL (si usas repositorios SQL)

## Estructura
- `frontend/`: app React + Vite
- `backend/`: API Express + Socket.IO
- `doc/`: documentacion funcional y tecnica
- `scripts/`: utilidades de desarrollo

## Inicio rapido
1. Instalar dependencias:
```bash
npm run install:all
```
2. Ejecutar frontend y backend:
```bash
npm run dev
```

## Scripts (raiz)
- `npm run dev`: levanta frontend y backend en paralelo
- `npm run dev:frontend`: solo frontend
- `npm run dev:backend`: solo backend
- `npm run build`: build de frontend
- `npm run lint`: lint de frontend
- `npm run start`: arranque backend en modo produccion

## Variables de entorno
Configura `backend/.env` segun tu entorno. Ejemplo minimo:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=monitores
DB_PORT=3306
PORT=4000
```

## Documentacion
- `doc/FRONTEND.md`
- `doc/BACKEND.md`
- `doc/DATABASE.md`
- `doc/GUIA_PROYECTO.md`
- `doc/APRENDIZAJE.md`

## Notas
- El backend soporta capas `services/repositories` para separar logica de acceso a datos.
- Hay pruebas unitarias en `frontend/src/utils/*.test.mjs`.
