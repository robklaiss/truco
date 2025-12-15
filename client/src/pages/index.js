import { ensureUserDoc, getUserDoc } from "../user_store.js";
import { qs, setText, setUserChip } from "../ui.js";
import { db, onAuth } from "../firebase.js";
import { doc, getDoc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { loadCardsMeta } from "../cards.js";

const userChip = document.querySelector("#userChip");
const loginLink = qs("#loginLink");
const photoEl = qs("#userPhoto");
const nameEl = qs("#userName");
const logoutEl = qs("#btnLogout");

const nicknameEl = qs("#nickname");
const statusEl = qs("#status");

const btnCreate = qs("#btnCreate");
const btnJoin = qs("#btnJoin");
const btnBot = qs("#btnBot");
const joinCodeEl = qs("#joinCode");
const matchModeEl = document.querySelector("#matchMode");
const targetPointsEl = document.querySelector("#targetPoints");
const matchTargetWinsEl = document.querySelector("#matchTargetWins");

const BOT_UID = "BOT";
const BOT_NICK = "Bot";

function gameIdFromInput() {
  return String(joinCodeEl.value || "").trim().toUpperCase();
}

function randomGameId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

async function createOrJoinGame({ user, nickname, gameId, matchMode, targetPoints, matchTargetWins }) {
  const gameRef = doc(db, "games", gameId);
  const cards = await loadCardsMeta();
  const deck = cards.map((c) => c.cardId).filter(Boolean);

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  const shuffled = shuffle(deck);
  const mode = String(matchMode || "hands");
  const targetWins = Number(matchTargetWins || 2);
  const tgtPoints = Number(targetPoints || 30);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists()) {
      const initPointsByUid = {};
      initPointsByUid[user.uid] = 0;
      tx.set(gameRef, {
        createdAt: serverTimestamp(),
        status: "waiting",
        deck: shuffled,
        handNo: 1,
        handWinners: [],
        matchTargetWins: targetWins,
        matchMode: mode,
        targetPoints: mode === "points" ? tgtPoints : null,
        pointsByUid: mode === "points" ? initPointsByUid : null,
        matchWinnerUid: null,
        handUid: user.uid,
        turnUid: user.uid,
        firstCardPlayed: false,
        trucoValue: 1,
        trucoLastRaiseUid: null,
        callPending: null,
        envido: { state: "none" },
        trickNo: 1,
        trickPlays: {},
        trickWinners: [],
        trickHistory: [],
        finishedWinnerUid: null,
        table: [],
        players: [{ uid: user.uid, nickname }]
      });
      return;
    }

    const g = snap.data();
    const players = Array.isArray(g.players) ? g.players.slice() : [];
    const already = players.find((p) => p && p.uid === user.uid);
    if (!already) {
      if (players.length >= 2) {
        throw new Error("Partida llena.");
      }
      players.push({ uid: user.uid, nickname });
    }

    if (players.length === 2 && g.status === "waiting") {
      const gameDeck = Array.isArray(g.deck) && g.deck.length ? g.deck : shuffled;
      const myIdx = players.findIndex((p) => p && p.uid === user.uid);
      const myHand = myIdx === 0 ? gameDeck.slice(0, 3) : gameDeck.slice(3, 6);
      tx.set(doc(db, "games", gameId, "private", user.uid), { hand: myHand, handNo: Number(g.handNo || 1), createdAt: serverTimestamp() }, { merge: true });
      tx.update(gameRef, {
        status: "playing",
        deck: gameDeck,
        players,
        handNo: Number(g.handNo || 1),
        handWinners: Array.isArray(g.handWinners) ? g.handWinners : [],
        matchTargetWins: Number(g.matchTargetWins || 2),
        matchWinnerUid: g.matchWinnerUid ?? null,
        handUid: players[0].uid,
        turnUid: players[0].uid,
        firstCardPlayed: false,
        trucoValue: 1,
        trucoLastRaiseUid: null,
        callPending: null,
        envido: { state: "none" },
        trickNo: 1,
        trickPlays: {},
        trickWinners: [],
        trickHistory: [],
        finishedWinnerUid: null,
        table: []
      });
      return;
    }

    if (g?.matchMode === "points" && g?.targetPoints) {
      const pb = (g.pointsByUid && typeof g.pointsByUid === "object") ? { ...g.pointsByUid } : {};
      if (pb[user.uid] == null) pb[user.uid] = 0;
      tx.update(gameRef, { players, pointsByUid: pb });
    } else {
      tx.update(gameRef, { players });
    }
  });
}

async function createBotGame({ user, nickname, targetPoints }) {
  const gameId = randomGameId();
  const gameRef = doc(db, "games", gameId);

  const cards = await loadCardsMeta();
  const deck = cards.map((c) => c.cardId).filter(Boolean);

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  const shuffled = shuffle(deck);
  const tgtPoints = Number(targetPoints || 30);
  const players = [{ uid: user.uid, nickname }, { uid: BOT_UID, nickname: BOT_NICK }];

  const myHand = shuffled.slice(0, 3);
  const botHand = shuffled.slice(3, 6);
  const pointsByUid = { [user.uid]: 0, [BOT_UID]: 0 };

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    if (snap.exists()) {
      throw new Error("Código en uso. Reintentá.");
    }

    tx.set(gameRef, {
      createdAt: serverTimestamp(),
      status: "playing",
      deck: shuffled,
      handNo: 1,
      handWinners: [],
      matchTargetWins: 2,
      matchMode: "points",
      targetPoints: tgtPoints,
      pointsByUid,
      matchWinnerUid: null,
      handUid: user.uid,
      turnUid: user.uid,
      firstCardPlayed: false,
      trucoValue: 1,
      trucoLastRaiseUid: null,
      callPending: null,
      envido: { state: "none" },
      trickNo: 1,
      trickPlays: {},
      trickWinners: [],
      trickHistory: [],
      finishedWinnerUid: null,
      table: [],
      botHand,
      botHandNo: 1,
      players
    });

    tx.set(doc(db, "games", gameId, "private", user.uid), { hand: myHand, handNo: 1, createdAt: serverTimestamp() }, { merge: true });
  });

  return gameId;
}

onAuth(async (user) => {
  setText(statusEl, "");
  if (!user) {
    if (userChip) userChip.style.display = "none";
    loginLink.style.display = "block";
    setText(nicknameEl, "(no autenticado)");
    btnCreate.disabled = true;
    btnJoin.disabled = true;
    btnBot.disabled = true;
    return;
  }

  loginLink.style.display = "none";
  if (userChip) userChip.style.display = "flex";

  await ensureUserDoc(user);
  const { data } = await getUserDoc(user.uid);
  const nickname = data?.nickname || "";

  setText(nicknameEl, nickname || "(sin apodo)");
  setUserChip({ photoEl, nameEl, logoutEl }, user, nickname);

  btnCreate.disabled = !nickname;
  btnJoin.disabled = !nickname;
  btnBot.disabled = !nickname;

  if (!nickname) {
    statusEl.style.color = "var(--danger)";
    setText(statusEl, "Elegí un apodo antes de jugar.");
  } else {
    statusEl.style.color = "var(--muted)";
    setText(statusEl, "Listo para jugar. Creá una partida o uníte con código.");

    btnCreate.onclick = async () => {
      btnCreate.disabled = true;
      btnJoin.disabled = true;
      try {
        const id = randomGameId();
        const matchMode = String(matchModeEl?.value || "hands");
        const targetPoints = Number(targetPointsEl?.value || 30);
        const matchTargetWins = Number(matchTargetWinsEl?.value || 2);
        await createOrJoinGame({ user, nickname, gameId: id, matchMode, targetPoints, matchTargetWins });
        window.location.href = `/game.html?gameId=${encodeURIComponent(id)}`;
      } catch (e) {
        statusEl.style.color = "var(--danger)";
        setText(statusEl, e?.message || String(e));
        btnCreate.disabled = false;
        btnJoin.disabled = false;
      }
    };

    btnJoin.onclick = async () => {
      const id = gameIdFromInput();
      if (!id) return;
      btnCreate.disabled = true;
      btnJoin.disabled = true;
      try {
        const gameRef = doc(db, "games", id);
        const snap = await getDoc(gameRef);
        if (!snap.exists()) {
          throw new Error("No existe una partida con ese código.");
        }
        const matchMode = String(matchModeEl?.value || "hands");
        const targetPoints = Number(targetPointsEl?.value || 30);
        const matchTargetWins = Number(matchTargetWinsEl?.value || 2);
        await createOrJoinGame({ user, nickname, gameId: id, matchMode, targetPoints, matchTargetWins });
        window.location.href = `/game.html?gameId=${encodeURIComponent(id)}`;
      } catch (e) {
        statusEl.style.color = "var(--danger)";
        setText(statusEl, e?.message || String(e));
        btnCreate.disabled = false;
        btnJoin.disabled = false;
      }
    };

    btnBot.onclick = async () => {
      btnCreate.disabled = true;
      btnJoin.disabled = true;
      btnBot.disabled = true;
      try {
        const targetPoints = Number(targetPointsEl?.value || 30);
        const id = await createBotGame({ user, nickname, targetPoints });
        window.location.href = `/game.html?gameId=${encodeURIComponent(id)}`;
      } catch (e) {
        statusEl.style.color = "var(--danger)";
        setText(statusEl, e?.message || String(e));
        btnCreate.disabled = false;
        btnJoin.disabled = false;
        btnBot.disabled = false;
      }
    };
  }
});
