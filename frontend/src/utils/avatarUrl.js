export const resolveAvatarUrl = (foto, apiUrl = '') => {
  const value = String(foto || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) return value;
  const prefix = (() => {
    const raw = String(apiUrl || '').trim();
    if (!raw) return '';
    try { return new URL(raw).origin; } catch { return ''; }
  })();
  return `${prefix}${value.startsWith('/') ? value : `/${value}`}`;
};
