import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

function signToken(userId, userType) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const ut = userType === 'admin' ? 'admin' : 'user';
  return jwt.sign({ sub: String(userId), ut }, secret, { expiresIn });
}

function userPayload(user) {
  return {
    id: user._id,
    email: user.email,
    userType: user.userType === 'admin' ? 'admin' : 'user',
  };
}

export async function signup(req, res, next) {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash });
    const token = signToken(user._id, user.userType);
    res.status(201).json({
      token,
      user: userPayload(user),
    });
  } catch (e) {
    next(e);
  }
}

export async function login(req, res, next) {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken(user._id, user.userType);
    res.json({
      token,
      user: userPayload(user),
    });
  } catch (e) {
    next(e);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.userId).select('email userType').lean();
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    res.json({
      id: user._id,
      email: user.email,
      userType: user.userType === 'admin' ? 'admin' : 'user',
    });
  } catch (e) {
    next(e);
  }
}
