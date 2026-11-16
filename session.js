import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
const cookieName = 'trip_session';
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
  return s;
}
function equal(a, b) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}
export function currentUser(req) {
  try {
    const token = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
    if (!token) return null;
    const [payload, signature] = token.split('.');
    if (!signature || !equal(signature, createHmac('sha256', secret()).update(payload).digest('base64url'))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return [1,2].includes(data.id) && data.exp > Date.now() ? data : null;
  } catch { return null; }
}
export function sameOrigin(req) {
  const origin = req.headers.origin;
  return !origin || origin === 'https://'+req.headers.host || (process.env.NODE_ENV !== 'production' && origin === 'http://'+req.headers.host);
}
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') { const u=currentUser(req); return res.status(u?200:401).json(u?{id:u.id}:{error:'请先登录'}); }
  if (!sameOrigin(req)) return res.status(403).json({error:'请求来源不允许'});
  if (req.method === 'DELETE') { res.setHeader('Set-Cookie',cookieName+'=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'); return res.status(200).json({ok:true}); }
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { id, password } = req.body || {};
    if (![1,2].includes(id) || typeof password !== 'string' || password.length > 256) return res.status(401).json({error:'账号或密码不正确'});
    const expected=process.env['EDITOR_'+id+'_PASSWORD'];
    if (!expected || expected.length < 16) return res.status(503).json({error:'管理员尚未配置长密码（至少16位）'});
    if (!equal(password,expected)) return res.status(401).json({error:'账号或密码不正确'});
    const payload=Buffer.from(JSON.stringify({id,exp:Date.now()+7*86400000})).toString('base64url');
    const token=payload+'.'+createHmac('sha256',secret()).update(payload).digest('base64url');
    res.setHeader('Set-Cookie',cookieName+'='+token+'; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800');
    return res.status(200).json({id});
  } catch { return res.status(503).json({error:'服务器尚未完成配置'}); }
}
