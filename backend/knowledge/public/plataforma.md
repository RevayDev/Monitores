# MONITORES - Plataforma

## Roles de usuario
- student: Estudiante, se inscribe a monitorías, consulta horarios, califica servicios.
- monitor_academico: Monitor académico, ofrece monitorías, registra módulos, marca asistencia.
- monitor_administrativo: Monitor administrativo, similar al académico con enfoque administrativo.
- admin: Administrador, gestiona usuarios, módulos, reportes y soporte.
- dev: Desarrollador, acceso técnico completo, logs, configuración del sistema.

## Navegación
- / : Página principal (hero, cards de staff, características).
- /signup: Registro de estudiante.
- /login: Inicio de sesión.
- /profile: Perfil personal con datos, estadísticas, QR y foto.
- /help: Centro de ayuda / ticket de soporte.
- /monitorias: Explorar monitorías disponibles.
- /mis-monitorias: Mis monitorías inscritas (estudiante).
- /monitor-dashboard: Panel del monitor.
- /admin-dashboard: Panel de administración.
- /modules/:id/forum: Foro del módulo.

## Funcionalidades principales
- Dashboard personalizado por rol.
- Inscripción a monitorías por materia, sede y cuatrimestre.
- Registro de asistencia con código QR.
- Sistema de foros con hilos, mensajes y respuestas.
- Sistema de soporte con tickets y chat en vivo.
- Estadísticas y reportes globales y por usuario.
- Notificaciones en tiempo real.
- Asistente IA (RevayBot) para preguntas.
- Sistema de quejas y reclamos.
- Feedback sobre módulos (calificación anónima o pública).
- Gestión de sesiones académicas con asistencia y excusas.

## Autenticación
Sistema basado en headers x-user-id y x-user-role. El frontend los envía automáticamente desde datos guardados en localStorage.
