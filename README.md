# 🎓 MONITORES - Plataforma de Gestión Académica

**Monitores** es una plataforma moderna y profesional diseñada para facilitar la conexión entre monitores y estudiantes, optimizando el registro y seguimiento de monitorías académicas.

## 🚀 Características Principales

### 🎓 Para Estudiantes
- **Exploración de Monitorías**: Buscador inteligente por módulo, monitor o sede.
- **Registro Simplificado**: Inscripción en un solo clic con sistema de doble confirmación para evitar errores.
- **Mis Monitorías**: Panel personal para gestionar inscripciones y acceder rápidamente a los recursos de contacto.
- **Comunicación Directa**: Acceso dinámico a links de WhatsApp, Teams o correo institucional del monitor.

### 🧑‍🏫 Para Monitores
- **Panel de Control**: Gestión centralizada de estudiantes inscritos y módulos asignados.
- **Administración de Enlaces**: Posibilidad de configurar y editar enlaces de WhatsApp y Teams para sus sesiones.
- **Gestión de Estudiantes**: Control de asistencia y bajas con retroalimentación personalizada.
- **Modo Dual**: Los monitores pueden alternar entre su panel de control y la vista de estudiante manteniendo sus privilegios originales.

## 🛠️ Stack Tecnológico

- **Frontend**: React 19 + Vite.
- **Estilos**: Tailwind CSS 4 (Diseño Premium & Responsive).
- **Iconografía**: Lucide React.
- **Enrutamiento**: React Router 7.
- **Estado/Almacenamiento**: Persistencia local mediante `localStorage`.

## 📡 Arquitectura de API (Mock)

> [!IMPORTANT]
> Actualmente, la lógica de datos reside íntegramente en `src/services/api.js`.

Este archivo simula un backend completo utilizando el `localStorage` del navegador. Está diseñado de forma modular para que, en un futuro, las llamadas a funciones como `getMonitorias()` o `login()` puedan ser reemplazadas fácilmente por peticiones a un servidor real (REST API / GraphQL) sin afectar la lógica de los componentes.

### Plan de Migración Futura:
- **Endpoints**: Sustitución de la lógica de `localStorage` por llamadas `fetch` o `axios`.
- **Autenticación**: Implementación de JWT (JSON Web Tokens) o servicios como Firebase/Auth0.
- **Persistencia**: Migración a una base de datos relacional (PostgreSQL/MySQL) o NoSQL (MongoDB).

## 📥 Instalación y Desarrollo

1. **Clonar el repositorio**:
   ```bash
   git clone <url-del-repositorio>
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Ejecutar en modo desarrollo**:
   ```bash
   npm run dev
   ```

4. **Construir para producción**:
   ```bash
   npm run build
   ```

## ⚖️ Licencia
Este proyecto es de uso institucional y académico.
