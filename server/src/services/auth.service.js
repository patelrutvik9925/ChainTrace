import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { AppError } from '../middleware/errorHandler.js';
import { createAuditLog } from './audit.service.js';
import { isDatabaseConnected } from '../config/database.js';
import logger from '../config/logger.js';

// ── Demo user registry ─────────────────────────────────────────────────────────
// Used ONLY when MongoDB is unavailable and DEMO_MODE=true.
// Passwords are checked with plain equality here (demo-only, never live data).
// These credentials match what is displayed on the login page.
const DEMO_USERS = {
  admin: {
    _id: 'demo-admin-0001',
    username: 'admin',
    email: 'admin@sih183.gov.in',
    password: 'SIH183Admin@2026',
    fullName: 'System Administrator',
    role: 'ADMIN',
    department: 'Cyber Crime Investigation',
    isActive: true,
    isDemo: true,
  },
  investigator1: {
    _id: 'demo-inv-0001',
    username: 'investigator1',
    email: 'investigator1@sih183.gov.in',
    password: 'Investigator@123',
    fullName: 'Arjun Sharma',
    role: 'INVESTIGATOR',
    badgeNumber: 'CBI-001',
    department: 'Cyber Crime Cell',
    isActive: true,
    isDemo: true,
  },
  analyst1: {
    _id: 'demo-inv-0002',
    username: 'analyst1',
    email: 'analyst1@sih183.gov.in',
    password: 'Analyst@123',
    fullName: 'Priya Nair',
    role: 'INVESTIGATOR',
    badgeNumber: 'CBI-002',
    department: 'Blockchain Analytics',
    isActive: true,
    isDemo: true,
  },
  viewer1: {
    _id: 'demo-viewer-0001',
    username: 'viewer1',
    email: 'viewer1@sih183.gov.in',
    password: 'Viewer@123',
    fullName: 'Rajesh Kumar',
    role: 'VIEWER',
    department: 'Legal Review',
    isActive: true,
    isDemo: true,
  },
};

// ── Token generation ───────────────────────────────────────────────────────────
export function generateToken(userId, extraPayload = {}) {
  return jwt.sign(
    { id: userId, ...extraPayload },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
}

// ── Demo-mode login (no DB required) ──────────────────────────────────────────
function loginDemo(username, password) {
  const demoUser = DEMO_USERS[username] || Object.values(DEMO_USERS).find(u => u.email === username);

  if (!demoUser || !demoUser.isActive) {
    throw new AppError('Invalid credentials.', 401, 'INVALID_CREDENTIALS');
  }
  if (demoUser.password !== password) {
    throw new AppError('Invalid credentials.', 401, 'INVALID_CREDENTIALS');
  }

  // Embed the full user profile in the token payload so the authenticate
  // middleware can hydrate req.user without a DB query.
  const { password: _pw, ...safeUser } = demoUser;
  const token = generateToken(demoUser._id, { demoUser: safeUser });

  logger.info(`[DEMO MODE] User ${demoUser.username} authenticated (no DB)`);
  return { token, user: safeUser };
}

// ── Primary login function ─────────────────────────────────────────────────────
export async function loginUser({ username, password, ipAddress, userAgent }) {
  const isDemo = process.env.DEMO_MODE === 'true';
  const dbUp = isDatabaseConnected();

  // ── Demo mode bypass: DB unavailable ────────────────────────────────────────
  if (isDemo && !dbUp) {
    const result = loginDemo(username, password);
    // Audit log is best-effort; skip silently when DB is down
    logger.info(`[DEMO] Login audit skipped — no DB. User: ${result.user.username}`);
    return result;
  }

  // ── Normal DB-backed authentication ─────────────────────────────────────────
  const user = await User.findOne({
    $or: [{ username }, { email: username }],
  }).select('+password');

  if (!user || !user.isActive) {
    await createAuditLog({
      action: 'LOGIN_FAILED',
      description: `Failed login attempt for: ${username}`,
      result: 'FAILURE',
      ipAddress,
      userAgent,
    });
    throw new AppError('Invalid credentials.', 401, 'INVALID_CREDENTIALS');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await createAuditLog({
      action: 'LOGIN_FAILED',
      username: user.username,
      userId: user._id,
      description: 'Invalid password',
      result: 'FAILURE',
      ipAddress,
      userAgent,
    });
    throw new AppError('Invalid credentials.', 401, 'INVALID_CREDENTIALS');
  }

  user.lastLogin = new Date();
  user.loginCount += 1;
  await user.save();

  const token = generateToken(user._id);

  await createAuditLog({
    action: 'LOGIN',
    userId: user._id,
    username: user.username,
    description: `User ${user.username} logged in`,
    result: 'SUCCESS',
    ipAddress,
    userAgent,
  });

  logger.info(`User ${user.username} logged in from ${ipAddress}`);
  return { token, user };
}

// ── Seed helpers (only called when DB is available) ───────────────────────────
export async function createInitialAdmin() {
  if (!isDatabaseConnected()) return;
  const existing = await User.findOne({ role: 'ADMIN' });
  if (existing) return;

  const admin = new User({
    username: 'admin',
    email: 'admin@sih183.gov.in',
    password: 'SIH183Admin@2026',
    fullName: 'System Administrator',
    role: 'ADMIN',
    department: 'Cyber Crime Investigation',
  });
  await admin.save();
  logger.info('Default admin user created: admin / SIH183Admin@2026');
}

export async function createDemoUsers() {
  if (!isDatabaseConnected()) return;
  const demoUsers = [
    { username: 'investigator1', email: 'investigator1@sih183.gov.in', password: 'Investigator@123', fullName: 'Arjun Sharma', role: 'INVESTIGATOR', badgeNumber: 'CBI-001', department: 'Cyber Crime Cell' },
    { username: 'analyst1',      email: 'analyst1@sih183.gov.in',      password: 'Analyst@123',       fullName: 'Priya Nair',    role: 'INVESTIGATOR', badgeNumber: 'CBI-002', department: 'Blockchain Analytics' },
    { username: 'viewer1',       email: 'viewer1@sih183.gov.in',       password: 'Viewer@123',        fullName: 'Rajesh Kumar',  role: 'VIEWER',       department: 'Legal Review' },
  ];
  for (const userData of demoUsers) {
    const exists = await User.findOne({ username: userData.username });
    if (!exists) {
      const user = new User(userData);
      await user.save();
      logger.info(`Demo user created: ${userData.username}`);
    }
  }
}
