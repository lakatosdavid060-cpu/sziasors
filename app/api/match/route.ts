import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getAdminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/session';
import { z } from 'zod';

export const runtime = 'nodejs';
const schema = z.object({ county: z.string().min(1), action: z.enum(['join','status']) });
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'A munkamenet lejárt. Lépj be újra.' }, { status: 401 });
  try {
    const { county, action } = schema.parse(await req.json());
    const db = getAdminDb();
    if (action === 'status') {
      const ref = db.ref(`userMatches/${session.uid}`);
      const snap = await ref.get();
      if (!snap.exists()) return NextResponse.json({ status: 'waiting' });
      const matchSnap = await db.ref(`matches/${snap.val().matchId}`).get();
      if (!matchSnap.exists() || matchSnap.val().status !== 'active') { await ref.remove(); return NextResponse.json({ status: 'waiting' }); }
      return NextResponse.json({ status: 'matched', match: { id: snap.val().matchId, ...matchSnap.val() } });
    }
    const pool = 'adult';
    const queueRef = db.ref(`queues/${pool}`);
    const now = Date.now();
    const matchId = randomUUID();
    let paired: { uid: string; nickname: string; county: string } | null = null;
    const result = await queueRef.transaction((current) => {
      paired = null;
      const waiting: Record<string, { uid: string; nickname: string; county: string; createdAt: number }> = { ...(current?.waiting || {}) };
      for (const [key, candidate] of Object.entries(waiting)) {
        if (now - candidate.createdAt > 90_000) delete waiting[key];
      }
      const candidate = Object.values(waiting).find((person) =>
        person.uid !== session.uid && (person.county === 'random' || county === 'random' || person.county === county)
      );
      if (candidate) {
        paired = { uid: candidate.uid, nickname: candidate.nickname, county: candidate.county };
        delete waiting[candidate.uid];
      } else {
        waiting[session.uid] = { uid: session.uid, nickname: session.nickname, county, createdAt: now };
      }
      return { waiting, updatedAt: now };
    }, undefined, false);
    if (paired && result.committed) {
      const match = { user1: { uid: paired.uid, nickname: paired.nickname }, user2: { uid: session.uid, nickname: session.nickname }, status: 'active', createdAt: now, county };
      await db.ref(`matches/${matchId}`).set(match);
      await Promise.all([
        db.ref(`userMatches/${paired.uid}`).set({ matchId, createdAt: now }),
        db.ref(`userMatches/${session.uid}`).set({ matchId, createdAt: now }),
      ]);
      return NextResponse.json({ status: 'matched', match: { id: matchId, ...match } });
    }
    return NextResponse.json({ status: 'waiting' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Párosítási hiba.' }, { status: 500 });
  }
}
