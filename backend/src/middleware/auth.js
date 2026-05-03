import jwt from 'jsonwebtoken';

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');
    const payload = jwt.verify(token, secret);
    req.userId = payload.sub;
    req.userType = payload.ut === 'admin' ? 'admin' : 'user';
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
