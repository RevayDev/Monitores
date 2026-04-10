const buckets = new Map();

const now = () => Date.now();

export const rateLimit = ({ windowMs, max, keyFn, message }) => {
  return (req, res, next) => {
    const key = keyFn(req);
    if (!key) return next();

    const bucketKey = `${req.path}:${key}`;
    const current = buckets.get(bucketKey);
    const timestamp = now();

    if (!current || timestamp > current.resetAt) {
      buckets.set(bucketKey, { count: 1, resetAt: timestamp + windowMs });
      return next();
    }

    if (current.count >= max) {
      return res.status(429).json({ error: message || 'Demasiadas solicitudes. Intenta más tarde.' });
    }

    current.count += 1;
    buckets.set(bucketKey, current);
    next();
  };
};

export default rateLimit;
