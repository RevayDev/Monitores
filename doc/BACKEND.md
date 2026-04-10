# Arquitectura Backend (Node.js + Express)

El backend sigue una arquitectura de **Capas (Layered Architecture)** para separar responsabilidades y facilitar el mantenimiento.

## Estructura de Capas
1. **Routes**: Define los endpoints de la API y mapea las URLs a funciones del controlador.
2. **Controllers**: Maneja las peticiones HTTP, extrae datos de `req.body` o `req.params` y envía respuestas.
3. **Services**: Contiene la lógica de negocio. Es donde se procesan los datos antes de guardarlos.
4. **Repositories**: Capa de acceso a datos. Es la única que sabe si estamos usando JSON o MySQL.
5. **Models**: Define la estructura de los objetos (Clases de JavaScript).

## Tecnologías
- **Node.js**: Entorno de ejecución.
- **Express**: Framework para servidores web.
- **ES Modules (ESM)**: Uso de `import/export` moderno.
- **MySQL2**: Driver para la conexión con la base de datos SQL.

## Flujo de una Petición
`Cliente` -> `Route` -> `Controller` -> `Service` -> `Repository` -> `DB`
