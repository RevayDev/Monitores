export const resolveAvatarUrl = (foto, apiUrl = '') => {
  let value = String(foto || '').trim();
  if (!value) return '';

  // Normalize absolute URLs pointing to localhost/127.0.0.1 to relative paths
  if (/^https?:\/\//i.test(value)) {
    try {
      const urlObj = new URL(value);
      if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
        value = urlObj.pathname + urlObj.search;
      }
    } catch {
      // Ignore URL parsing exceptions
    }
  }

  if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }

  const prefix = (() => {
    const raw = String(apiUrl || '').trim();
    if (!raw) return window.location.origin;
    try {
      return new URL(raw).origin;
    } catch {
      return window.location.origin;
    }
  })();

  return `${prefix}${value.startsWith('/') ? value : `/${value}`}`;
};
