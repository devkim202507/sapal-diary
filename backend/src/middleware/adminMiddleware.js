import { User } from '../models/User.js';

/** JWT와 무관하게 DB의 userType으로 판별 (DB에서 admin 지정 후 재로그인 없이 반영 가능) */
export async function adminMiddleware(req, res, next) {
  try {
    const user = await User.findById(req.userId).select('userType').lean();
    if (!user || user.userType !== 'admin') {
      return res.status(403).json({ error: '관리자만 이용할 수 있습니다.' });
    }
    next();
  } catch (e) {
    next(e);
  }
}
