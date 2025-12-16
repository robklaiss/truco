const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

initializeApp();

exports.leaderboardSnapshot = onSchedule("every 30 minutes", async () => {
  const db = getFirestore();

  const snap = await db
    .collection("leaderboard")
    .orderBy("elo", "desc")
    .limit(50)
    .get();

  const top = snap.docs.map((docSnap, idx) => {
    const d = docSnap.data() || {};
    return {
      rank: idx + 1,
      uid: docSnap.id,
      nickname: d.nickname || docSnap.id,
      elo: d.elo ?? null,
      wins: d.wins ?? 0,
      losses: d.losses ?? 0
    };
  });

  await db.doc("leaderboardSnapshots/current").set(
    {
      generatedAt: FieldValue.serverTimestamp(),
      top,
      count: top.length
    },
    { merge: true }
  );
});
