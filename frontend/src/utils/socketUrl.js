export const getSocketUrl = () => {
  const raw = String(import.meta.env.VITE_SOCKET_URL || '').trim();
  // In development (Vite proxy), always use window.location.origin so the
  // proxy can forward /api/socket.io to the backend on port 3000.
  if (import.meta.env.DEV) return window.location.origin;
  if (!raw || raw === '/' || raw.startsWith('/')) return window.location.origin;
  try {
    const parsed = new URL(raw, window.location.origin);
    return parsed.origin;
  } catch {
    return window.location.origin;
  }
};
