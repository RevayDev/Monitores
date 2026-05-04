export const getPageItems = (items = [], page = 1, perPage = 5) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safePerPage = Math.max(1, Number(perPage) || 5);
  const start = (safePage - 1) * safePerPage;
  return (items || []).slice(start, start + safePerPage);
};

export const getPageNumbers = (totalItems = 0, perPage = 5) => {
  const pages = Math.max(1, Math.ceil((Number(totalItems) || 0) / Math.max(1, Number(perPage) || 5)));
  return Array.from({ length: pages }, (_, index) => index + 1);
};

export const parseLogMetadata = (metadata) => {
  if (!metadata) return {};
  if (typeof metadata === 'object') return metadata;
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
};
