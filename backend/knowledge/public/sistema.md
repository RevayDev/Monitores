# MONITORES - Sistema

## Requisitos técnicos
- Node.js 22+
- MySQL 8 (utf8mb4, charset utf8mb4_unicode_ci)
- npm
- SMTP configurado para correos (Gmail)
- Ollama opcional para asistente IA (http://localhost:11434)
- Puerto 3000 (backend), 5173 (frontend desarrollo)

## Stack tecnológico
Frontend: React 19, Vite 6, Tailwind CSS 4, Framer Motion 12, Lucide React, React Router 7, socket.io-client 4, jsQR.
Backend: Node.js (ES Modules), Express 4, mysql2 3, Socket.io 4, Multer, Nodemailer, bcryptjs, adm-zip.
Base de datos: MySQL 8.

## Errores comunes
1. Estadísticas en 0: falta la ruta GET /api/attendance.
2. Socket no conecta: verificar VITE_SOCKET_URL y path /api/socket.io.
3. Login falla: verificar headers x-user-id y x-user-role.
4. Modo mantenimiento: si maintenance.global es true, solo dev pueden acceder.
5. Cuenta suspendida: is_active = 0 o restrictions activas.
6. Error conexión MySQL: verificar MySQL 8 y credenciales en .env.
7. Vite conserva errores viejos: limpiar cache y reiniciar.

## Seguridad
- Contraseñas hasheadas con bcryptjs.
- Tokens de reseteo SHA256, expiran en 30 minutos.
- Rate limiting para QR y foros.
- Logging de auditoría en activity_logs.
- Middleware de autenticación por headers.
- Middleware de roles.
- Admin principal (is_principal) necesario para crear otros admins.

## Variables de entorno (.env)
PORT, MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, FRONTEND_URL, CORS_ORIGINS, SMTP_HOST/PORT/USER/PASS/FROM, SUPPORT_EMAIL, OLLAMA_URL.

## Comandos
npm run install:all: instalar dependencias.
npm run dev: iniciar backend y frontend.
npm run build: build de frontend.
npm run db:init: inicializar base de datos.
npm run db:reset: resetear tablas operativas.

## Despliegue
Compatible con Azure (variables WEBSITE_HOSTNAME, WEBSITE_INSTANCE_ID). Frontend se sirve como build estático. Backend con PM2. Proxy reverso con Nginx.
