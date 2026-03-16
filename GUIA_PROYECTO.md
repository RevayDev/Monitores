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
Aunque usamos `require`, la idea es que el **Servicio** use el **Repositorio**. Esto permite que en el futuro, con un solo cambio de importación, el sistema cambie de cerebro (JSON -> MySQL).

### Modelos
Son clases que definen cómo luce un objeto (Usuario, Monitoría). Ayudan a que el código sea predecible y fácil de leer.

---

## 5. Próximos Pasos Sugeridos
1. **Implementar MySQL**: Crea las tablas y rellena los archivos en `repositories/mysql/`.
2. **JWT (Seguridad)**: Actualmente la sesión es sencilla. Podrías añadir tokens JWT para hacer el backend más robusto.
3. **Validaciones**: Usa librerías como `joi` o `zod` en los controladores para validar que los datos que envía el usuario sean correctos antes de llegar al servicio.

---
*Documento generado para el aprendizaje y evolución del proyecto Monitores.*
