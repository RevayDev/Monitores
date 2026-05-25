# ARQUITECTURA TÉCNICA

## Capas del backend
Routes → Controllers → Services → MySQL

## Tablas principales
- users: id, nombre, email, role, sede, cuatrimestre, foto
- modules: monitorId, modulo, cuatrimestre, horario, sede
- registrations: studentEmail, moduloId, monitorId
- attendance: monitorId, studentName, date, rating
- support_tickets: id, requester_user_id, category, subject, status
- support_ticket_messages: ticket_id, sender_id, message
- notifications: user_id, type, message, is_read

## Tecnologías
- Frontend: React 19, Vite, Tailwind CSS 4, Lucide React, Framer Motion
- Backend: Node.js, Express, ES Modules
- DB: MySQL, mysql2
- Persistencia local: localStorage

## Errores comunes
- Estadísticas en 0 → falta ruta GET /api/attendance
- Socket no conecta → verificar VITE_SOCKET_URL y path /api/socket.io
- Login falla → verificar x-user-id y x-user-role headers

## Migración histórica
El proyecto migró de JSON/localStorage a MySQL por escalabilidad.
