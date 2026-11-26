import admin from "firebase-admin";

function getAdmin() {
  if (admin.apps.length) return admin.app();
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) throw new Error("Firebase Admin env vars missing");
  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    databaseURL: "https://blackcrown-cf4e0-default-rtdb.firebaseio.com"
  });
}

const counties = new Set([
  "Budapest","Bács-Kiskun","Baranya","Békés","Borsod-Abaúj-Zemplén","Csongrád-Csanád",
  "Fejér","Győr-Moson-Sopron","Hajdú-Bihar","Heves","Jász-Nagykun-Szolnok",
  "Komárom-Esztergom","Nógrád","Pest","Somogy","Szabolcs-Szatmár-Bereg",
  "Tolna","Vas","Veszprém","Zala"
]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const app = getAdmin();
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!idToken) return res.status(401).json({ error: "Hiányzó bejelentkezési token." });
    const decoded = await admin.auth(app).verifyIdToken(idToken);
    const uid = decoded.uid;
    const db = admin.database(app);
    const body = req.body || {};
    const action = body.action;

    if (action === "join") {
      const nickname = String(body.nickname || "").trim().slice(0, 24);
      const county = body.county === "any" || counties.has(body.county) ? body.county : "any";
      const myCounty = counties.has(body.myCounty) ? body.myCounty : null;
      if (!myCounty) return res.status(400).json({ error: "Válaszd ki a saját megyédet is." });
      if (nickname.length < 2) return res.status(400).json({ error: "A becenév legalább 2 karakter legyen." });
      if (body.ageGroup !== "adult" || body.adultConfirmed !== true) {
        return res.status(403).json({ error: "Ez a szolgáltatás jelenleg csak 18 év felettieknek érhető el." });
      }

      const queueRef = db.ref("queue/adults");
      const existing = (await db.ref(`queue/adults/${uid}`).get()).val();
      if (existing?.status === "matched" && existing.matchId) {
        const oldMatch = (await db.ref(`matches/${existing.matchId}`).get()).val();
        if (oldMatch?.status === "active") return res.status(200).json({
          status:"matched", matchId:existing.matchId,
          peerUid:oldMatch.user1 === uid ? oldMatch.user2 : oldMatch.user1,
          isInitiator:oldMatch.user1 === uid
        });
      }

      const matchId = db.ref("matches").push().key;
      const entry = {
        uid, nickname, county:myCounty, filterCounty:county,
        ageGroup:"adult", status:"waiting", createdAt:Date.now()
      };
      let transaction = await queueRef.transaction(queue => {
        if (!queue) queue = {};
        const current = queue[uid];
        if (current?.status === "matched" && current.matchId) return;
        queue[uid] = entry;
        const candidates = Object.values(queue)
          .filter(item => item && item.uid !== uid && item.status === "waiting" && Date.now() - (item.createdAt || 0) < 120000)
          .filter(item => county === "any" || item.county === county)
          .filter(item => item.filterCounty === "any" || item.filterCounty === myCounty)
          .sort((a,b) => (a.createdAt || 0) - (b.createdAt || 0));
        const candidate = candidates[0];
        if (candidate) {
          queue[candidate.uid] = { ...candidate, status:"matched", partnerUid:uid, matchId };
          queue[uid] = { ...entry, status:"matched", partnerUid:candidate.uid, matchId };
        }
        return queue;
      });

      if (!transaction.committed) {
        const current = transaction.snapshot.child(uid).val();
        if (current?.status === "matched" && current.matchId) {
          const oldMatch = (await db.ref(`matches/${current.matchId}`).get()).val();
          if (oldMatch?.status === "active") return res.status(200).json({
            status:"matched", matchId:current.matchId,
            peerUid:oldMatch.user1 === uid ? oldMatch.user2 : oldMatch.user1,
            isInitiator:oldMatch.user1 === uid
          });
        }
        return res.status(200).json({ status:"waiting" });
      }

      const myQueueEntry = transaction.snapshot.child(uid).val();
      if (myQueueEntry?.status === "matched" && myQueueEntry.matchId === matchId) {
        const peerUid = myQueueEntry.partnerUid;
        const peerEntry = transaction.snapshot.child(peerUid).val();
        await db.ref(`matches/${matchId}`).set({
          user1:peerUid, user2:uid, status:"active", createdAt:Date.now(),
          nicknames:{ [peerUid]:peerEntry?.nickname || "Partner", [uid]:nickname }
        });
        return res.status(200).json({ status:"matched", matchId, peerUid, isInitiator:false });
      }
      return res.status(200).json({ status:"waiting" });
    }

    if (action === "status") {
      const item = (await db.ref(`queue/adults/${uid}`).get()).val();
      if (item?.status === "matched" && item.matchId) {
        const match = (await db.ref(`matches/${item.matchId}`).get()).val();
        if (match?.status === "active") return res.status(200).json({
          status:"matched", matchId:item.matchId,
          peerUid:match.user1 === uid ? match.user2 : match.user1,
          isInitiator:match.user1 === uid
        });
      }
      return res.status(200).json({ status:item?.status || "idle" });
    }

    if (action === "leave") {
      const queueRef = db.ref(`queue/adults/${uid}`);
      const item = (await queueRef.get()).val();
      if (item?.matchId) {
        const matchRef = db.ref(`matches/${item.matchId}`);
        const match = (await matchRef.get()).val();
        if (match && (match.user1 === uid || match.user2 === uid)) {
          await matchRef.update({ status:"ended", endedAt:Date.now() });
          const peerUid = match.user1 === uid ? match.user2 : match.user1;
          const peerRef = db.ref(`queue/adults/${peerUid}`);
          const peer = (await peerRef.get()).val();
          if (peer?.matchId === item.matchId) await peerRef.remove();
        }
      }
      await queueRef.remove();
      return res.status(200).json({ ok:true });
    }

    return res.status(400).json({ error:"Ismeretlen művelet." });
  } catch (error) {
    console.error("Match API error:", error);
    return res.status(500).json({ error:"Szerverhiba. Ellenőrizd a Vercel környezeti változóit." });
  }
}
