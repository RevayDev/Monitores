# MONITORES - Información Personal

## Registro
POST /api/signup. Datos requeridos: nombre, email, username, contraseña, sede, cuatrimestre.

## Inicio de sesión
POST /api/login. Usa identifier (email o username), role y password. Devuelve objeto de usuario.

## Cierre de sesión
POST /api/logout. El frontend limpia los datos de localStorage.

## Recuperación de contraseña
1. Usuario ingresa su username en /forgot-password.
2. POST /api/password/forgot: genera token aleatorio, lo hashea con SHA256 y lo guarda.
3. Se envía correo SMTP con enlace: {FRONTEND_URL}/reset-password?token={token}.
4. El enlace expira en 30 minutos.
5. Usuario abre el enlace y crea nueva contraseña.
6. POST /api/password/reset: verifica token y actualiza contraseña.

Correo SMTP: monitoreshub@gmail.com via Gmail (smtp.gmail.com:587).

## Gestión de perfil
- GET /api/users/:id: Ver datos del usuario.
- PUT /api/users/:id: Actualizar nombre, email, username, sede, cuatrimestre, contraseña, foto.
- DELETE /api/users/:id: Eliminar cuenta (con confirmación de contraseña).
- POST /api/upload: Subir foto de perfil (multipart, max 2MB, solo imágenes).

## Perfil (/profile)
Tabs: Información y Estadísticas.
- Datos personales: nombre, email, username, rol (solo lectura), sede, cuatrimestre.
- Seguridad: cambio de contraseña.
- Zona de peligro: eliminación de cuenta.
- Foto de perfil con carga y eliminación.
- Tarjeta QR personal.
- Estado de la cuenta y restricciones.

## Restricciones de cuenta
Los usuarios pueden tener restricciones: login, search, dashboards, registrations, management.
Cuentas con is_active = 0 están suspendidas.
Solo admin, dev o is_principal pueden modificar datos personales.
