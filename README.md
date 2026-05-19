# MONITORES

Plataforma de monitorias con React/Vite + Node/Express + MySQL 8.

## Comandos
```bash
npm run install:all
npm run db:init
npm run db:seed:roots
npm run db:check
npm run dev
npm run build
npm run start
```

## DB (MySQL 8)
- `db:init`: crea/actualiza esquema y seeds base.
- `db:seed:roots`: garantiza root admin/dev.
- `db:check`: valida tablas y prueba real de escritura/lectura.
- `db:reset`: limpia tablas operativas.

## Nota frontend
Si Vite conserva errores viejos de assets, reinicia `npm run dev` tras limpiar caché.

## Ayuda y Soporte
- Ruta: `/help`
- Formulario: `POST /api/support/contact`
- Requiere SMTP en `.env`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SUPPORT_EMAIL`
