# Arquitectura Frontend (React + Vite)

Este documento describe la estructura y el flujo de la aplicación cliente.

## Tecnologías Principales
- **React**: Biblioteca para la interfaz de usuario.
- **Vite**: Herramienta de construcción (build tool) ultra rápida.
- **TailwindCSS**: Framework de CSS para diseño rápido y moderno.
- **Lucide React**: Set de iconos vectoriales.
- **Framer Motion**: Biblioteca para animaciones y transiciones.

## Estructura de Carpetas (`src/`)
- `/components`: Componentes reutilizables (Botones, Modales, Tarjetas).
- `/pages`: Vistas principales de la aplicación (Home, Login, Dashboards).
- `/services`: Lógica de comunicación con el backend (`api.js`).
- `/assets`: Recursos estáticos como imágenes y estilos globales.

## Flujo de Datos
1. El usuario interactúa con un componente en una `Page`.
2. El componente llama a una función en `services/api.js`.
3. `api.js` realiza una petición `fetch` al backend (Node.js).
4. El backend responde con JSON.
5. React actualiza el `useState` y re-renderiza la interfaz.

## Manejo de Sesión
- Se utiliza `localStorage` para persistir el rol actual y los datos básicos del usuario (`monitores_current_role`).
- Las contraseñas se validan en el backend.
