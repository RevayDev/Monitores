# Estructura de Base de Datos (MySQL)

El sistema ha sido migrado de un archivo JSON a una base de datos relacional para mayor robustez y escalabilidad.

## Relaciones Principales
- **users**: Almacena todos los usuarios (Estudiantes, Monitores, Admins, Devs).
- **modules**: Contiene la información de las monitorías creadas por los monitores.
- **registrations**: Tabla que vincula a un estudiante con una monitoría.
- **attendance**: Registro de asistencias y valoraciones.
- **complaints**: Reportes o quejas sobre sesiones.

## Diagrama Lógico
- `users.id` -> `modules.monitorId` (Un monitor crea muchos módulos).
- `users.email` -> `registrations.studentEmail` (Un estudiante se registra en monitorías).
- `modules.id` -> `registrations.moduloId` (Relación M:N simplificada).

## Script de Creación (SQL)
Si prefieres crear la base de datos manualmente en **phpMyAdmin**, puedes usar este script:

```sql
CREATE DATABASE IF NOT EXISTS monitores_db;
USE monitores_db;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    sede VARCHAR(100),
    cuatrimestre VARCHAR(100),
    foto TEXT,
    is_principal BOOLEAN DEFAULT FALSE
);

CREATE TABLE modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    monitorId INT,
    monitor VARCHAR(255),
    monitorEmail VARCHAR(255),
    modulo VARCHAR(255) NOT NULL,
    cuatrimestre VARCHAR(100),
    modalidad VARCHAR(100),
    horario VARCHAR(255),
    salon VARCHAR(100),
    sede VARCHAR(100),
    descripcion TEXT,
    whatsapp VARCHAR(255),
    teams VARCHAR(255)
);

CREATE TABLE registrations (
    id INT PRIMARY KEY,
    studentName VARCHAR(255),
    studentEmail VARCHAR(255),
    modulo VARCHAR(255),
    monitorId INT,
    registeredAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    monitorId INT,
    studentName VARCHAR(255),
    date VARCHAR(100),
    rating INT,
    comment TEXT
);

CREATE TABLE complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    monitorId INT,
    studentName VARCHAR(255),
    studentEmail VARCHAR(255),
    reason VARCHAR(255),
    details TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
    config_key VARCHAR(255) PRIMARY KEY,
    config_value TEXT
);

CREATE TABLE static_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_key VARCHAR(100),
    item_value VARCHAR(255)
);
```

## Tablas de Configuración
- **settings**: Guarda pares clave-valor (ej. modo mantenimiento).
- **static_data**: Almacena listas desplegables (sedes, programas, cuatrimestres).
