# Guia del Proyecto (MySQL only)

## Arquitectura backend
`routes -> controllers -> services -> repositories(mysql)`

No existe almacenamiento JSON en runtime.

## Flujo backend
1. Route recibe request.
2. Controller valida entrada/salida.
3. Service aplica reglas de negocio.
4. Repository ejecuta SQL en MySQL.

## Flujo frontend
1. `src/App.jsx` define rutas.
2. `src/pages/` renderiza vistas.
3. `src/services/api.js` consume backend.
4. `src/components/` contiene UI reusable.

## Escalado recomendado frontend
- Crear nuevas features en `src/modules/<modulo>/`
- Centralizar acciones por dominio en `src/commands/`

## Inicializacion de entorno
1. `npm run install:all`
2. Configurar `backend/.env`
3. `npm run db:init`
4. `npm run dev`
