export const getSocketUrl = () => {
  const raw = String(import.meta.env.VITE_SOCKET_URL || '').trim();
  if (!raw || raw === '/' || raw.startsWith('/')) return window.location.origin;
  try {
    const parsed = new URL(raw, window.location.origin);
    return parsed.origin;
  } catch {
    return window.location.origin;
  }
};
