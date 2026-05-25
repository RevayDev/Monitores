export const getApiOrigin = (apiUrl = '') => {
  const raw = String(apiUrl || '').trim();
  if (!raw) return 'http://localhost:3000';
  try {
    return new URL(raw).origin;
  } catch {
    return 'http://localhost:3000';
  }
};

export const resolveAvatarUrl = (foto, apiUrl = '') => {
  const value = String(foto || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) return value;
  return `${getApiOrigin(apiUrl)}${value.startsWith('/') ? value : `/${value}`}`;
};
