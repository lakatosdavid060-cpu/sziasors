import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession, sessionCookieName } from '@/lib/session';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { getApps } from 'firebase-admin/app';

const schema = z.object({ idToken: z.string().min(20), nickname: z.string().trim().min(2).max(18).regex(/^[\p{L}\p{N}_ -]+$/u), county: z.string().min(1), ageBand: z.enum(['adult','teen']) });
export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    if (body.ageBand === 'teen') return NextResponse.json({ error: 'A fiatalkorúak videóchatje életkor-ellenőrzés és külön biztonsági rendszer bevezetéséig nem érhető el.' }, { status: 403 });
    getAdminDb(); // initializes the Admin app before token verification
    const decoded = await getAuth(getApps()[0]).verifyIdToken(body.idToken);
    const { idToken, ...profile } = body;
    const { session, token } = createSession(profile, decoded.uid);
    const response = NextResponse.json({ uid: session.uid, nickname: session.nickname, county: session.county, ageBand: session.ageBand });
    response.cookies.set(sessionCookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Hibás adatok.' }, { status: 400 });
  }
}
