const extractUserId = (req) => {
  const headerUserId = req.headers['x-user-id'];
  const bodyUserId = req.body?.currentUserId || req.body?.userId;
  const queryUserId = req.query?.userId;
  const raw = headerUserId || bodyUserId || queryUserId;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const requireUserContext = (req, res, next) => {
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado en la solicitud.' });
  }
  req.userContext = { userId };
  next();
};

export default requireUserContext;
