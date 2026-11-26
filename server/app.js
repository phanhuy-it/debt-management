import 'dotenv/config';
import express from 'express';
import pg from 'pg';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { keys, loadRelationalData, saveRelationalData } from './dataStore.js';

const { DATABASE_URL, APP_PASSWORD, FRONTEND_ORIGIN, NODE_ENV } = process.env;
const isProduction = NODE_ENV === 'production' || process.env.VERCEL === '1';
const minPasswordLength = isProduction ? 20 : 14;
if (!DATABASE_URL || !APP_PASSWORD || APP_PASSWORD.length < minPasswordLength || !FRONTEND_ORIGIN) {
  throw new Error(`DATABASE_URL, APP_PASSWORD (at least ${minPasswordLength} characters) and FRONTEND_ORIGIN are required`);
}
const frontendOrigin = new URL(FRONTEND_ORIGIN).origin;
if (isProduction && !frontendOrigin.startsWith('https://')) {
  throw new Error('FRONTEND_ORIGIN must use HTTPS in production');
}

pg.types.setTypeParser(1082, value => value);
const pool = new pg.Pool({ connectionString: DATABASE_URL, enableChannelBinding: true, max: 2, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 });
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));

let initialization;
export function initializeDatabase() {
  if (!initialization) {
    initialization = pool.query(`
      CREATE TABLE IF NOT EXISTS public.debt_app_sessions (
        token_hash text PRIMARY KEY,
        expires_at timestamptz NOT NULL
      );
      CREATE TABLE IF NOT EXISTS public.debt_app_legacy_investments (
        id uuid PRIMARY KEY
      );
      CREATE TABLE IF NOT EXISTS public.debt_app_login_attempts (
        client_hash text PRIMARY KEY,
        attempts integer NOT NULL,
        expires_at timestamptz NOT NULL
      )
    `).then(async () => {
      await pool.query('DELETE FROM public.debt_app_sessions WHERE expires_at <= now()');
      await pool.query('DELETE FROM public.debt_app_login_attempts WHERE expires_at <= now()');
    }).catch(error => {
      initialization = undefined;
      throw error;
    });
  }
  return initialization;
}

const hash = value => createHash('sha256').update(value).digest('hex');
const cookieName = 'debt_session';
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000
};

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.get('origin') && req.get('origin') !== frontendOrigin) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('origin') !== frontendOrigin) {
    return res.status(403).json({ error: 'Invalid origin' });
  }
  next();
});

app.use('/api', async (req, res, next) => {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    console.error('Database initialization error:', error.message);
    res.status(503).json({ error: 'Không thể kết nối database. Kiểm tra cấu hình và nhật ký server.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const clientHash = hash(req.ip);
    const attempts = await pool.query(`
      INSERT INTO public.debt_app_login_attempts (client_hash, attempts, expires_at)
      VALUES ($1, 1, now() + interval '15 minutes')
      ON CONFLICT (client_hash) DO UPDATE SET
        attempts = CASE WHEN debt_app_login_attempts.expires_at <= now() THEN 1 ELSE debt_app_login_attempts.attempts + 1 END,
        expires_at = CASE WHEN debt_app_login_attempts.expires_at <= now() THEN now() + interval '15 minutes' ELSE debt_app_login_attempts.expires_at END
      RETURNING attempts
    `, [clientHash]);
    if (attempts.rows[0].attempts > 10) return res.status(429).json({ error: 'Quá nhiều lần thử. Vui lòng thử lại sau 15 phút.' });
    const supplied = typeof req.body?.password === 'string' ? req.body.password : '';
    const valid = timingSafeEqual(Buffer.from(hash(supplied), 'hex'), Buffer.from(hash(APP_PASSWORD), 'hex'));
    if (!valid) return res.status(401).json({ error: 'Mật khẩu không đúng' });
    await pool.query('DELETE FROM public.debt_app_login_attempts WHERE client_hash = $1', [clientHash]);
    const token = randomBytes(32).toString('base64url');
    await pool.query('INSERT INTO public.debt_app_sessions (token_hash, expires_at) VALUES ($1, now() + interval \'7 days\')', [hash(token)]);
    res.cookie(cookieName, token, cookieOptions).json({ authenticated: true });
  } catch (error) {
    console.error('Login database error:', error.message);
    res.status(500).json({ error: 'Không thể đăng nhập' });
  }
});

async function authenticate(req, res, next) {
  const token = req.headers.cookie?.split(';').map(part => part.trim())
    .find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return res.status(401).json({ error: 'Vui lòng đăng nhập' });
  try {
    const result = await pool.query('SELECT 1 FROM public.debt_app_sessions WHERE token_hash = $1 AND expires_at > now()', [hash(token)]);
    if (!result.rowCount) return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn' });
    req.sessionHash = hash(token);
    next();
  } catch (error) {
    console.error('Session database error:', error.message);
    res.status(500).json({ error: 'Không thể xác thực phiên đăng nhập' });
  }
}

app.get('/api/auth/session', authenticate, (req, res) => res.json({ authenticated: true }));
app.post('/api/auth/logout', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM public.debt_app_sessions WHERE token_hash = $1', [req.sessionHash]);
    res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined }).json({ authenticated: false });
  } catch (error) {
    console.error('Logout database error:', error.message);
    res.status(500).json({ error: 'Không thể đăng xuất' });
  }
});

app.get('/api/data', authenticate, async (req, res) => {
  try {
    res.json(await loadRelationalData(pool));
  } catch (error) {
    console.error('Load database error:', error.message);
    const message = error.message.startsWith('Bảng ') ? error.message : 'Không thể tải dữ liệu. Kiểm tra cấu trúc database và nhật ký backend.';
    res.status(500).json({ error: message });
  }
});

app.put('/api/data', authenticate, async (req, res) => {
  const { data, version } = req.body || {};
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      Object.keys(data).length !== keys.length ||
      !keys.every(key => Array.isArray(data[key])) ||
      typeof version !== 'string' || !/^[a-f0-9]{64}$/.test(version)) {
    return res.status(400).json({ error: 'Dữ liệu hoặc phiên bản không hợp lệ' });
  }
  try {
    const result = await saveRelationalData(pool, data, version);
    if (!result) return res.status(409).json({ error: 'Dữ liệu đã thay đổi ở phiên khác. Hãy tải lại trang trước khi lưu.' });
    res.json(result);
  } catch (error) {
    console.error('Save database error:', error.message);
    const message = error.message.startsWith('Bảng ') || error.message.startsWith('Dữ liệu chứa') ? error.message : 'Không thể lưu dữ liệu. Kiểm tra cấu trúc database và nhật ký backend.';
    res.status(500).json({ error: message });
  }
});

app.use((error, req, res, next) => {
  console.error('Request error:', error.message);
  res.status(error.status || 500).json({ error: 'Yêu cầu không hợp lệ hoặc server gặp lỗi' });
});

export { app, pool };
