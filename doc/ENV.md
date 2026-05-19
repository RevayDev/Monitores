# Variables de Entorno

Archivo: `backend/.env`

```env
NODE_ENV=production
PORT=3000
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=monitores_db
JWT_SECRET=replace_this_secret
FRONTEND_URL=http://localhost:5173

# Soporte por correo (Azure/SMTP)
SUPPORT_EMAIL=soporte@tu-dominio.com
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=soporte@tu-dominio.com
SMTP_PASS=tu_password_o_app_password
SMTP_FROM="Monitores Soporte <soporte@tu-dominio.com>"

# Azure App Service (opcional, informativo para logs)
WEBSITE_HOSTNAME=
```

Reglas:
- No subir `.env`
- Usar secretos fuertes en servidor
- Mantener consistencia entre ambientes
