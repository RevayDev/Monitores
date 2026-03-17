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

- **Frontend**: React 19 + Vite (ES Modules).
- **Backend**: Node.js + Express (ES Modules).
- **Estilos**: Tailwind CSS 4 (Diseño Premium & Responsive).
- **Iconografía**: Lucide React.
- **Enrutamiento**: React Router 7.
- **Estado/Almacenamiento**: MySQL (Servidor persistente) con persistencia local en `localStorage` para la sesión del Frontend.

## 📡 Arquitectura del Sistema

El proyecto utiliza una **Arquitectura por Capas** en el backend para facilitar el mantenimiento y la futura migración a bases de datos relacionales.

### Tecnologías Backend:
- **Node.js**: Entorno de ejecución en modo ES Modules.
- **Express**: Framework web.
- **MySQL2**: Conexión robusta a base de datos relacional.

## 📚 Documentación Detallada
Para aprender más sobre el funcionamiento interno, revisa:
- [`FRONTEND.md`](file:///c:/Users/RevayDev/Desktop/Monitores/FRONTEND.md): Arquitectura de la interfaz.
- [`BACKEND.md`](file:///c:/Users/RevayDev/Desktop/Monitores/BACKEND.md): Lógica del servidor y capas.
- [`DATABASE.md`](file:///c:/Users/RevayDev/Desktop/Monitores/DATABASE.md): Esquema de tablas y SQL.
- [`APRENDIZAJE.md`](file:///c:/Users/RevayDev/Desktop/Monitores/APRENDIZAJE.md): Temas recomendados para estudiar.
- [`GUIA_PROYECTO.md`](file:///c:/Users/RevayDev/Desktop/Monitores/GUIA_PROYECTO.md): Evolución y lecciones del proyecto.

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
