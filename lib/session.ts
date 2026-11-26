import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE = 'sziasors_session';
const secret = () => process.env.SESSION_SECRET || '';
export type Session = { uid: string; nickname: string; ageBand: 'adult' | 'teen'; county: string; issuedAt: number };
function sign(payload: string) { return createHmac('sha256', secret()).update(payload).digest('base64url'); }
export function createSession(data: Omit<Session, 'uid' | 'issuedAt'>, uid: string) {
  if (secret().length < 32) throw new Error('A SESSION_SECRET legalább 32 karakter legyen.');
  const session: Session = { ...data, uid, issuedAt: Date.now() };
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return { session, token: `${payload}.${sign(payload)}` };
}
export function verifyToken(token: string): Session | null {
  try {
    if (!secret() || token.length > 3000) return null;
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    const expected = Buffer.from(sign(payload)); const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Session;
    if (!data.uid || !data.nickname || Date.now() - data.issuedAt > 1000 * 60 * 60 * 24 * 7) return null;
    return data;
  } catch { return null; }
}
export async function getSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  return token ? verifyToken(token) : null;
}
export const sessionCookieName = COOKIE;
