# Herramientas de Mantenimiento - Monitores

Esta carpeta contiene scripts de utilidad para la administración rápida de la base de datos y tareas de desarrollo.

## Scripts Disponibles

### 1. Limpieza Total (`reset_db.js`)
Este script realiza un **Wipe Completo** de los datos operacionales. Es ideal para limpiar el entorno antes de una nueva fase de pruebas.

- **Qué hace**:
  - Borra todas las asistencias registradas.
  - Borra todos los consumos de comedor.
  - Borra el historial de escaneos QR.
  - **Borra todos los códigos QR registrados** (obliga a todos a generar nuevos).
  - Reinicia los contadores (ID) de las tablas a 1.

- **Cómo ejecutarlo**:
  Desde la carpeta raíz del proyecto:
  ```bash
  node scripts/reset_db.js
  ```

---

## Requisitos
- Tener Node.js instalado.
- La base de datos MySQL debe estar en ejecución.
- Las dependencias del backend deben estar instaladas (`npm install` en la carpeta backend).
