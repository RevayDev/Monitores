# Guía Maestra: Evolución y Arquitectura del Proyecto Monitores

Esta guía explica detalladamente cómo se transformó este proyecto desde un prototipo monolítico hasta un sistema escalable con arquitectura por capas, y las lecciones aprendidas durante el proceso.

## 1. La Evolución: De Monolito a Desacoplado

Originalmente, el proyecto guardaba todo en el navegador (`localStorage`). Esto era rápido para prototipar, pero tenía limitaciones:
- Los datos no se compartían entre diferentes navegadores o computadoras.
- La lógica de negocio estaba mezclada con la interfaz.

### El Gran Cambio: Frontend y Backend
Separamos el proyecto en dos carpetas:
- **`frontend/`**: La cara del usuario (Vite + React). Solo se encarga de mostrar datos y capturar interacciones.
- **`backend/`**: El cerebro del sistema (Node.js + Express). Se encarga de procesar datos, seguridad y persistencia en un archivo `db.json`.

---

## 2. La Arquitectura: Arquitectura por Capas (N-Tier)

Para que el proyecto pudiera crecer y cambiar a **MySQL** sin dolor, implementamos una arquitectura por capas. Imagina esto como una cebolla:

### Capa 1: Rutas (`routes/`)
Es la puerta de entrada. Define qué URLs existen (ej: `/api/users`). No saben qué pasa dentro, solo a quién llamar.
- **Lección**: Mantén las rutas limpias. Solo deben conectar URLs con controladores.

### Capa 2: Controladores (`controllers/`)
Reciben la petición HTTP (`req`, `res`). Su única tarea es extraer los datos del usuario (como el `id` o el `body`) y entregárselos al servicio.
- **Lección**: El controlador no debe tener lógica de "cálculo", solo manejo de entrada/salida.

### Capa 3: Servicios (`services/`)
Aquí vive la **Lógica de Negocio**. Es donde se decide si un usuario puede entrar, si un registro está duplicado, o cómo se calculan las estadísticas.
- **Lección**: Esta capa es la más importante. Debe ser independiente de si usas Express o si usas una base de datos específica.

### Capa 4: Repositorios (`repositories/`)
Es la única capa que toca la base de datos.
- **Abstracción**: Creamos `json/` para ahora y dejamos listo `mysql/` para después.
- **Lección**: Si cambias de base de datos, **solo tocas esta carpeta**. El resto del sistema ni se entera.

---

## 3. ¿Cómo arreglamos el problema de los stats en 0?

Durante el desarrollo, notamos que el Panel Admin mostraba todo en 0. Este fue el proceso de diagnóstico:

1.  **Identificación**: El frontend intentaba llamar a `GET /api/attendance` pero recibía un error **404**.
2.  **Causa**: Al migrar a capas, olvidamos definir la ruta de "obtención" (GET) de asistencias, solo estaba la de "creación" (POST).
3.  **Solución Paso a Paso**:
    - **Repositorio**: Añadimos `getAllAttendance()`.
    - **Servicio**: Añadimos el método para llamar al repositorio.
    - **Controlador**: Creamos la función para responder al frontend con JSON.
    - **Ruta**: Registramos `router.get('/attendance', ...)`.

---

## 4. Conceptos Clave para Aprender

### Middleware
Usamos middlewares para tareas repetitivas. Por ejemplo, el log que añadimos en `app.js`:
```javascript
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next(); // ¡Importante para que la petición siga su camino!
});
```

### Inyección de Dependencias (Concepto)
Aunque usamos **ES Modules (`import`)**, la idea es que el **Servicio** use el **Repositorio**. Esto permite que en el futuro, con un solo cambio de importación, el sistema cambie de cerebro (JSON -> MySQL).

### ES Modules (ESM)
El backend fue actualizado para usar **EcmaScript Modules**. Esto significa que:
- Usamos `import X from './archivo.js'` en lugar de `require`.
- Usamos `export default` o `export const` en lugar de `module.exports`.
- **Importante**: En el backend de Node.js con ESM, es obligatorio incluir la extensión `.js` en las importaciones locales.

### Modelos
Son clases que definen cómo luce un objeto (Usuario, Monitoría). Ayudan a que el código sea predecible y fácil de leer.

---

## 3. La Gran Migración: De JSON a MySQL

¡Lo logramos! El proyecto ahora es una aplicación web profesional con base de datos relacional. 

### ¿Qué cambió?
1. **Persistencia**: Los datos ya no se borran si reinicias el servidor; ahora viven en un servidor de base de datos (**MySQL**).
2. **Helper de Conexión**: Creamos `utils/mysql.helper.js` que maneja un **Pool de Conexiones**. Esto es más eficiente que abrir y cerrar conexiones todo el tiempo.
3. **Scripts de Automatización**: Creamos `migrate.js` para que pudieras mover tus datos viejos de `db.json` a la nueva DB sin perder nada.

### El Proceso de Migración:
1.  **Instalación**: Añadimos la librería `mysql2`.
2.  **Abstracción**: Implementamos los nuevos repositorios en `repositories/mysql/`.
3.  **Inyección**: Simplemente cambiamos una línea en los **Services** para que dejen de mirar la carpeta `json/` y empiecen a usar `mysql/`.

---

## 4. Conceptos Clave para Aprender
... (se mantienen los conceptos anteriores) ...

---

## 5. Próximos Pasos Sugeridos
1. **JWT (Seguridad)**: Actualmente la sesión es sencilla. Al tener MySQL, puedes crear una tabla de tokens para mayor seguridad.
2. **Validaciones**: Usa librerías como `joi` o `zod` en los controladores para validar los datos antes de guardarlos en SQL.
3. **Relaciones Complejas**: Ahora que tienes SQL, puedes empezar a usar `JOINs` para hacer consultas más potentes.

---
*Documento generado para el aprendizaje y evolución del proyecto Monitores.*

## Organización del proyecto

- **frontend/**: aplicación React (Vite) con componentes, páginas y lógica de UI.
- **backend/**: servidor Node.js + Express, estructurado en capas (routes, controllers, services, repositories) y usando MySQL (o JSON) para persistencia.
- **scripts/**: scripts de utilidad y pruebas (check_db.js, disable_maintenance.js, test_*.js).
- **documentacion/**: archivos Markdown que describen arquitectura, aprendizaje, guías y documentación del proyecto.
- **dist/**: build de producción generado por Vite.
- **APRENDIZAJE.md**: notas de aprendizaje y lecciones del desarrollo.
- **BACKEND.md**: descripción detallada del backend.
- **DATABASE.md**: esquema y configuración de la base de datos.
- **FRONTEND.md**: guía del frontend.
- **README.md**: información general del proyecto.

Esta estructura permite separar claramente la lógica de presentación, la lógica de negocio y la persistencia, facilitando escalabilidad y mantenimiento.

