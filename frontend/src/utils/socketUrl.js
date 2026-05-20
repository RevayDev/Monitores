const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

export const getSocketUrl = () => {
  const envSocket = trimTrailingSlash(import.meta.env.VITE_SOCKET_URL);
  if (envSocket) return envSocket;

  const envApi = trimTrailingSlash(import.meta.env.VITE_API_URL);
  if (envApi) return envApi.replace(/\/api$/, '');

  return window.location.origin;
};

