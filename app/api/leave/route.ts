import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/session';
export const runtime = 'nodejs';
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: true });
  try {
    const db = getAdminDb();
    const matchRef = db.ref(`userMatches/${session.uid}`);
    const matchSnap = await matchRef.get();
    if (matchSnap.exists()) {
      const matchId = matchSnap.val().matchId;
      const match = await db.ref(`matches/${matchId}`).get();
      await db.ref(`matches/${matchId}/status`).set('ended');
      await db.ref(`userMatches/${session.uid}`).remove();
      if (match.exists()) { const other = match.val().user1.uid === session.uid ? match.val().user2.uid : match.val().user1.uid; await db.ref(`userMatches/${other}`).remove(); }
    }
    await db.ref(`queues/adult/waiting/${session.uid}`).remove();
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ ok: true }); }
}
