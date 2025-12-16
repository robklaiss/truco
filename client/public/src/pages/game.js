import { db } from "../firebase.js";
import { ensureUserDoc, getUserDoc } from "../user_store.js";
import { qs, requireAuthOrRedirect, setText, setUserChip } from "../ui.js";
import { loadCardsMeta } from "../cards.js";
import { cardIdToPng } from "../lib/cartasAssets.js";
import { doc, onSnapshot, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const photoEl = qs("#userPhoto");
const nameEl = qs("#userName");
const logoutEl = qs("#btnLogout");

const gameIdEl = qs("#gameId");
const publicStateEl = document.querySelector("#publicState");
const privateStateEl = qs("#privateState");
const turnEl = qs("#turn");
const gameStatusEl = qs("#gameStatus");
const winnerBannerEl = document.querySelector("#winnerBanner");
const matchMetaEl = document.querySelector("#matchMeta");
const handMetaEl = document.querySelector("#handMeta");
const scoreMeNameEl = document.querySelector("#scoreMeName");
const scoreOtherNameEl = document.querySelector("#scoreOtherName");
const scoreMeMatchEl = document.querySelector("#scoreMeMatch");
const scoreOtherMatchEl = document.querySelector("#scoreOtherMatch");
const scoreMeHandEl = document.querySelector("#scoreMeHand");
const scoreOtherHandEl = document.querySelector("#scoreOtherHand");
const historyListEl = document.querySelector("#historyList");
const btnNextHandEl = document.querySelector("#btnNextHand");
const tableEl = qs("#table");
const tableWinnerEl = document.querySelector("#tableWinner");
const handEl = qs("#hand");
const handHintEl = qs("#handHint");

const callStatusEl = document.querySelector("#callStatus");
const callResponseRowEl = document.querySelector("#callResponseRow");
const btnQuieroEl = document.querySelector("#btnQuiero");
const btnNoQuieroEl = document.querySelector("#btnNoQuiero");
const btnEnvidoEl = document.querySelector("#btnEnvido");
const btnRealEnvidoEl = document.querySelector("#btnRealEnvido");
const btnFaltaEnvidoEl = document.querySelector("#btnFaltaEnvido");
const btnTrucoEl = document.querySelector("#btnTruco");
const btnRetrucoEl = document.querySelector("#btnRetruco");
const btnVale4El = document.querySelector("#btnVale4");

const overlayEl = qs("#overlay");
const overlayTextEl = qs("#overlayText");
const btnCloseOverlay = qs("#btnCloseOverlay");

const cardsPreviewEl = document.querySelector("#cardsPreview");
const cardsPreviewStatusEl = document.querySelector("#cardsPreviewStatus");

btnCloseOverlay.addEventListener("click", () => {
  overlayEl.classList.remove("visible");
});

function showOverlay(txt) {
  setText(overlayTextEl, txt);
  overlayEl.classList.add("visible");
}

function setCardImg(imgEl, cardId) {
  imgEl.alt = cardId;
  imgEl.decoding = "async";
  imgEl.loading = "lazy";
  imgEl.src = cardIdToPng(cardId);
}

function renderCardStrip(container, items, { clickable = false, onClick } = {}) {
  container.innerHTML = "";
  for (const it of items) {
    const wrap = document.createElement("button");
    wrap.type = "button";
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.alignItems = "center";
    wrap.style.gap = "6px";
    wrap.style.padding = "8px";
    wrap.style.background = "rgba(11,16,32,0.35)";
    wrap.style.border = "1px solid var(--border)";
    wrap.style.borderRadius = "12px";
    wrap.style.cursor = clickable ? "pointer" : "default";
    wrap.disabled = !clickable;

    const img = document.createElement("img");
    setCardImg(img, it.cardId);
    img.style.width = "86px";
    img.style.height = "auto";
    img.style.borderRadius = "10px";

    const label = document.createElement("div");
    label.className = "small mono";
    label.textContent = it.label || it.cardId;

    wrap.appendChild(img);
    wrap.appendChild(label);
    if (clickable) {
      wrap.addEventListener("click", () => onClick && onClick(it.cardId));
    }
    container.appendChild(wrap);
  }
}

let lastTableCardByUid = new Map();

function renderTableSlots(container, game, myUid) {
  container.innerHTML = "";
  container.style.display = "flex";
  container.style.gap = "12px";
  container.style.overflow = "auto";
  container.style.padding = "6px 0";
  container.style.justifyContent = "center";

  const nick = nicknameByUid(game);
  const other = otherUid(game, myUid);

  let otherLabel = other ? (nick.get(other) || other.slice(0, 6)) : "rival";
  if (other === "BOT") otherLabel = "Bot";

  const table = Array.isArray(game?.table) ? game.table : [];
  const byUid = new Map();
  for (const t of table) {
    if (t?.uid && t?.cardId) byUid.set(t.uid, t.cardId);
  }

  const slots = [
    { uid: myUid, label: nick.get(myUid) || "vos" },
    { uid: other, label: otherLabel }
  ];

  const nextTableCardByUid = new Map();

  for (const s of slots) {
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.alignItems = "center";
    wrap.style.gap = "6px";
    wrap.style.padding = "8px";
    wrap.style.background = "rgba(11,16,32,0.35)";
    wrap.style.border = "1px solid var(--border)";
    wrap.style.borderRadius = "12px";
    wrap.style.minWidth = "110px";

    const cid = s.uid ? byUid.get(s.uid) : "";
    if (s.uid) nextTableCardByUid.set(s.uid, cid || "");
    if (cid) {
      const img = document.createElement("img");
      setCardImg(img, cid);
      img.style.width = "112px";
      img.style.height = "auto";
      img.style.borderRadius = "10px";

      const prevCid = s.uid ? (lastTableCardByUid.get(s.uid) || "") : "";
      if (s.uid && cid !== prevCid) {
        try {
          img.animate([
            { opacity: 0, transform: "translateY(10px) scale(0.98)" },
            { opacity: 1, transform: "translateY(0) scale(1)" }
          ], {
            duration: 260,
            easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
            fill: "both"
          });
        } catch {
        }
      }
      wrap.appendChild(img);
    } else {
      const ph = document.createElement("div");
      ph.style.width = "112px";
      ph.style.height = "156px";
      ph.style.borderRadius = "10px";
      ph.style.border = "1px dashed var(--border)";
      ph.style.display = "flex";
      ph.style.alignItems = "center";
      ph.style.justifyContent = "center";
      ph.style.color = "var(--muted)";
      ph.textContent = "–";
      wrap.appendChild(ph);
    }

    const label = document.createElement("div");
    label.className = "small mono";
    label.textContent = s.label;
    wrap.appendChild(label);

    container.appendChild(wrap);
  }

  lastTableCardByUid = nextTableCardByUid;
}

function otherUid(game, uid) {
  const players = Array.isArray(game?.players) ? game.players : [];
  const other = players.find((p) => p && p.uid && p.uid !== uid);
  return other?.uid || "";
}

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

function nicknameByUid(game) {
  const players = Array.isArray(game?.players) ? game.players : [];
  const map = new Map();
  for (const p of players) {
    if (p?.uid) map.set(p.uid, p.nickname || p.uid.slice(0, 6));
  }
  return map;
}

function computeEnvidoScore(handCardIds, metaById) {
  const cards = (Array.isArray(handCardIds) ? handCardIds : [])
    .map((cid) => ({ cid, meta: metaById.get(cid) }))
    .filter((x) => x.meta && x.meta.suit);

  if (cards.length === 0) return 0;

  const bySuit = new Map();
  for (const c of cards) {
    const suit = c.meta.suit;
    const v = Number(c.meta.envidoValue || 0);
    if (!bySuit.has(suit)) bySuit.set(suit, []);
    bySuit.get(suit).push(v);
  }

  let best = 0;
  for (const vs of bySuit.values()) {
    if (vs.length >= 2) {
      const sorted = vs.slice().sort((a, b) => b - a);
      best = Math.max(best, 20 + sorted[0] + sorted[1]);
    }
  }

  if (best > 0) return best;
  return Math.max(...cards.map((c) => Number(c.meta.envidoValue || 0)));
}

function envidoBaseValue(kind) {
  if (kind === "envido") return 2;
  if (kind === "real_envido") return 3;
  if (kind === "falta_envido") return null;
  return null;
}

function trucoNextValue(kind) {
  if (kind === "truco") return 2;
  if (kind === "retruco") return 3;
  if (kind === "vale4") return 4;
  return null;
}

function setCantoButtonsEnabled({ enabled, pointsMode }) {
  const all = [btnEnvidoEl, btnRealEnvidoEl, btnFaltaEnvidoEl, btnTrucoEl, btnRetrucoEl, btnVale4El];
  for (const b of all) {
    if (!b) continue;
    b.disabled = !enabled || !pointsMode;
  }
}

function renderNarrative({ game, myUid }) {
  if (!matchMetaEl || !handMetaEl || !historyListEl) return;

  const nick = nicknameByUid(game);
  const players = Array.isArray(game?.players) ? game.players : [];
  const meNick = nick.get(myUid) || "vos";
  const other = players.find((p) => p?.uid && p.uid !== myUid);
  const otherUidVal = other?.uid || "";
  const otherNick = (otherUidVal && nick.get(otherUidVal)) || "rival";

  const mode = String(game?.matchMode || "hands");
  const history = Array.isArray(game?.trickHistory) ? game.trickHistory : [];
  const handWinners = Array.isArray(game?.handWinners) ? game.handWinners : [];
  const matchTargetWins = Number(game?.matchTargetWins || 2);
  const matchWinnerUid = game?.matchWinnerUid || "";
  const winsByUid = {};
  for (const h of history) {
    if (h?.winnerUid) winsByUid[h.winnerUid] = (winsByUid[h.winnerUid] || 0) + 1;
  }
  const myWins = winsByUid[myUid] || 0;
  const otherWins = otherUidVal ? (winsByUid[otherUidVal] || 0) : 0;

  const trickNo = Number(game?.trickNo || 1);
  const plays = (game?.trickPlays && typeof game.trickPlays === "object") ? game.trickPlays : {};

  let myMatchVal = 0;
  let otherMatchVal = 0;
  let matchLine = "";
  const handNo = Number(game?.handNo || 1);

  if (mode === "points") {
    const pb = (game?.pointsByUid && typeof game.pointsByUid === "object") ? game.pointsByUid : {};
    const tgt = Number(game?.targetPoints || 0);
    myMatchVal = Number(pb[myUid] || 0);
    otherMatchVal = otherUidVal ? Number(pb[otherUidVal] || 0) : 0;
    matchLine = `Puntos: ${meNick} ${myMatchVal} - ${otherMatchVal} ${otherNick}${tgt ? ` (a ${tgt})` : ""} | Mano ${handNo}`;
  } else {
    const matchWinsByUid = {};
    for (const w of handWinners) {
      if (w) matchWinsByUid[w] = (matchWinsByUid[w] || 0) + 1;
    }
    myMatchVal = matchWinsByUid[myUid] || 0;
    otherMatchVal = otherUidVal ? (matchWinsByUid[otherUidVal] || 0) : 0;
    matchLine = `Partida: ${meNick} ${myMatchVal} - ${otherMatchVal} ${otherNick} (primero a ${matchTargetWins}) | Mano ${handNo}`;
  }

  if (scoreMeNameEl) setText(scoreMeNameEl, meNick);
  if (scoreOtherNameEl) setText(scoreOtherNameEl, otherNick);
  if (scoreMeMatchEl) setText(scoreMeMatchEl, String(myMatchVal));
  if (scoreOtherMatchEl) setText(scoreOtherMatchEl, String(otherMatchVal));

  historyListEl.innerHTML = "";
  for (const h of history) {
    const tno = Number(h?.trickNo || 0);
    const p = (h?.plays && typeof h.plays === "object") ? h.plays : {};
    const uids = Object.keys(p);
    const aUid = uids[0] || "";
    const bUid = uids[1] || "";
    const aNick = (aUid && (nick.get(aUid) || aUid.slice(0, 6))) || "";
    const bNick = (bUid && (nick.get(bUid) || bUid.slice(0, 6))) || "";
    const winNick = h?.winnerUid ? (nick.get(h.winnerUid) || h.winnerUid.slice(0, 6)) : "";

    const row = document.createElement("div");
    row.className = "result-card";
    row.style.padding = "8px";
    row.innerHTML = `
      <div class="small">Baza ${tno}</div>
      <div class="mono" style="white-space:pre-wrap;">${aNick}: ${p[aUid] || ""}\n${bNick}: ${p[bUid] || ""}</div>
      <div class="small" style="color: var(--ok);">Gana: ${winNick || "-"}</div>
    `;
    historyListEl.appendChild(row);
  }

  if (Object.keys(plays).length) {
    const row = document.createElement("div");
    row.className = "result-card";
    row.style.padding = "8px";
    const playLines = [];
    for (const [uid, cid] of Object.entries(plays)) {
      const n = nick.get(uid) || uid.slice(0, 6);
      playLines.push(`${n}: ${cid}`);
    }
    row.innerHTML = `
      <div class="small">Baza ${trickNo} (en curso)</div>
      <div class="mono" style="white-space:pre-wrap;">${playLines.join("\n")}</div>
    `;
    historyListEl.appendChild(row);
  }

  setText(matchMetaEl, matchLine);

  const handLine = game?.status === "playing"
    ? `Mano: ${meNick} ${myWins} - ${otherWins} ${otherNick} | Baza ${trickNo}/3`
    : `Mano: ${meNick} ${myWins} - ${otherWins} ${otherNick}`;
  setText(handMetaEl, handLine);

  if (scoreMeHandEl) setText(scoreMeHandEl, String(myWins));
  if (scoreOtherHandEl) setText(scoreOtherHandEl, String(otherWins));

  if (matchWinnerUid) {
    const mwNick = nick.get(matchWinnerUid) || matchWinnerUid.slice(0, 6);
    if (winnerBannerEl) {
      winnerBannerEl.className = "banner ok";
      winnerBannerEl.style.display = "block";
      setText(winnerBannerEl, `Ganó la partida: ${mwNick}`);
    }
  } else if (game?.status === "playing") {
    if (winnerBannerEl) winnerBannerEl.style.display = "none";
  } else if (game?.status === "finished") {
    const winnerUid = game?.finishedWinnerUid || (history.length ? history[history.length - 1]?.winnerUid : "");
    const wNick = winnerUid ? (nick.get(winnerUid) || winnerUid.slice(0, 6)) : "";
    if (winnerBannerEl) {
      winnerBannerEl.className = "banner ok";
      winnerBannerEl.style.display = "block";
      setText(winnerBannerEl, wNick ? `Ganó la mano: ${wNick}` : "Mano terminada.");
    }
  } else {
    if (winnerBannerEl) winnerBannerEl.style.display = "none";
  }

  if (btnNextHandEl) {
    const canNext = game?.status === "finished" && !matchWinnerUid && Array.isArray(game?.players) && game.players.length === 2;
    btnNextHandEl.style.display = canNext ? "block" : "none";
  }
}

async function ensureJoinedAndMaybeStart({ gameId, user, nickname, deck }) {
  const gameRef = doc(db, "games", gameId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists()) {
      throw new Error("No existe una partida con ese código.");
    }

    const g = snap.data();
    const gameDeck = Array.isArray(g.deck) && g.deck.length ? g.deck : deck;
    const players = Array.isArray(g.players) ? g.players.slice() : [];
    const already = players.find((p) => p && p.uid === user.uid);
    if (!already) {
      if (players.length >= 2) {
        throw new Error("Partida llena.");
      }
      players.push({ uid: user.uid, nickname });
    }

    if (players.length === 2 && g.status === "waiting") {
      const myIdx = players.findIndex((p) => p && p.uid === user.uid);
      const myHand = myIdx === 0 ? gameDeck.slice(0, 3) : gameDeck.slice(3, 6);
      tx.set(doc(db, "games", gameId, "private", user.uid), { hand: myHand, handNo: Number(g.handNo || 1), createdAt: serverTimestamp() }, { merge: true });
      tx.update(gameRef, {
        status: "playing",
        deck: gameDeck,
        players,
        handUid: players[0].uid,
        turnUid: players[0].uid,
        handNo: Number(g.handNo || 1),
        handWinners: Array.isArray(g.handWinners) ? g.handWinners : [],
        matchTargetWins: Number(g.matchTargetWins || 2),
        matchWinnerUid: g.matchWinnerUid ?? null,
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

    tx.update(gameRef, { players, deck: gameDeck });
  });
}

async function playCard({ gameId, user, cardId, cardPower }) {
  const gameRef = doc(db, "games", gameId);
  const privRef = doc(db, "games", gameId, "private", user.uid);

  await runTransaction(db, async (tx) => {
    const gameSnap = await tx.get(gameRef);
    const privSnap = await tx.get(privRef);
    if (!gameSnap.exists()) throw new Error("Partida inexistente.");
    if (!privSnap.exists()) throw new Error("Sin mano.");

    const g = gameSnap.data();
    const p = privSnap.data();
    if (g.status !== "playing") throw new Error("La partida no está en juego.");
    if (g.matchWinnerUid) throw new Error("La partida ya terminó.");
    if (g.callPending) throw new Error("Hay un canto pendiente.");
    if (g.envido && g.envido.state === "waiting_declare") throw new Error("Resolviendo envido…");
    if (g.turnUid !== user.uid) throw new Error("No es tu turno.");

    const hand = Array.isArray(p.hand) ? p.hand.slice() : [];
    const idx = hand.indexOf(cardId);
    if (idx === -1) throw new Error("Esa carta no está en tu mano.");

    const trickNo = Number(g.trickNo || 1);
    const plays = (g.trickPlays && typeof g.trickPlays === "object") ? { ...g.trickPlays } : {};
    if (plays[user.uid]) throw new Error("Ya jugaste en esta baza.");

    hand.splice(idx, 1);
    tx.update(privRef, { hand });

    const table = Array.isArray(g.table) ? g.table.slice() : [];
    table.push({ uid: user.uid, cardId, trickNo });
    plays[user.uid] = cardId;

    const nextUid = otherUid(g, user.uid);
    let nextTurnUid = nextUid || user.uid;
    let nextStatus = g.status;
    let nextTrickNo = trickNo;
    let nextPlays = plays;
    let nextTable = table;
    let trickWinners = Array.isArray(g.trickWinners) ? g.trickWinners.slice() : [];
    let trickHistory = Array.isArray(g.trickHistory) ? g.trickHistory.slice() : [];
    let finishedWinnerUid = g.finishedWinnerUid ?? null;

    const playedUids = Object.keys(plays);
    if (playedUids.length >= 2) {
      const aUid = playedUids[0];
      const bUid = playedUids[1];
      const aCard = plays[aUid];
      const bCard = plays[bUid];
      const aPow = cardPower.get(aCard) ?? 0;
      const bPow = cardPower.get(bCard) ?? 0;
      const winner = aPow >= bPow ? aUid : bUid;
      trickWinners.push(winner);
      trickHistory.push({ trickNo, plays: { ...plays }, winnerUid: winner });
      nextTurnUid = winner;
      nextTrickNo = trickNo + 1;
      nextPlays = {};
      nextTable = [];

      const winsA = trickWinners.filter((x) => x === aUid).length;
      const winsB = trickWinners.filter((x) => x === bUid).length;
      const done = winsA >= 2 || winsB >= 2 || nextTrickNo > 3;
      if (done) {
        nextStatus = "finished";
        nextTurnUid = null;
        finishedWinnerUid = winsA >= winsB ? aUid : bUid;
      }
    }

    const update = {
      table: nextTable,
      trickPlays: nextPlays,
      trickNo: nextTrickNo,
      turnUid: nextTurnUid,
      status: nextStatus,
      trickWinners,
      trickHistory,
      finishedWinnerUid,
      firstCardPlayed: true
    };

    if (nextStatus === "finished") {
      const mode = String(g.matchMode || "hands");
      if (mode === "points" && g.targetPoints && finishedWinnerUid) {
        const pb = (g.pointsByUid && typeof g.pointsByUid === "object") ? { ...g.pointsByUid } : {};
        const stake = Number(g.trucoValue || 1);
        pb[finishedWinnerUid] = Number(pb[finishedWinnerUid] || 0) + stake;
        update.pointsByUid = pb;

        const tgt = Number(g.targetPoints || 0);
        if (tgt > 0 && pb[finishedWinnerUid] >= tgt) {
          update.matchWinnerUid = finishedWinnerUid;
        }
      }
    }

    tx.update(gameRef, update);
  });
}

function hideOverlay() {
  overlayEl.classList.remove("visible");
}

async function renderCardsPreview() {
  if (!cardsPreviewEl || !cardsPreviewStatusEl) return;

  cardsPreviewEl.innerHTML = "";
  cardsPreviewStatusEl.style.color = "var(--muted)";
  setText(cardsPreviewStatusEl, "Cargando…");

  try {
    const cards = await loadCardsMeta();
    const sample = cards
      .filter((c) => c && c.cardId)
      .slice(0, 12);

    if (sample.length === 0) {
      setText(cardsPreviewStatusEl, "cards.json vacío.");
      return;
    }

    setText(cardsPreviewStatusEl, `${cards.length} cartas`);

    for (const c of sample) {
      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexDirection = "column";
      wrap.style.alignItems = "center";
      wrap.style.gap = "6px";

      const img = document.createElement("img");
      setCardImg(img, c.cardId);
      img.style.width = "72px";
      img.style.height = "auto";
      img.style.border = "1px solid var(--border)";
      img.style.borderRadius = "10px";

      const label = document.createElement("div");
      label.className = "small mono";
      label.textContent = c.cardId;

      wrap.appendChild(img);
      wrap.appendChild(label);
      cardsPreviewEl.appendChild(wrap);
    }
  } catch (e) {
    cardsPreviewStatusEl.style.color = "var(--danger)";
    setText(cardsPreviewStatusEl, e?.message || String(e));
  }
}

(async () => {
  const user = await requireAuthOrRedirect();
  if (!user) return;

  await ensureUserDoc(user);
  const { data: userData } = await getUserDoc(user.uid);
  const nickname = userData?.nickname || "";
  setUserChip({ photoEl, nameEl, logoutEl }, user, nickname);

  renderCardsPreview();

  const cards = await loadCardsMeta();
  const cardPower = new Map();
  const envidoMetaById = new Map();
  for (const c of cards) {
    if (c && c.cardId) {
      cardPower.set(c.cardId, Number(c.trucoPower || 0));
      envidoMetaById.set(c.cardId, { suit: c.suit, envidoValue: Number(c.envidoValue || 0) });
    }
  }
  const deck = cards.map((c) => c.cardId).filter(Boolean);

  const gameId = new URLSearchParams(window.location.search).get("gameId");
  setText(gameIdEl, gameId || "(missing)");

  if (!gameId) {
    showOverlay("Falta gameId en la URL.");
    return;
  }

  const pubRef = doc(db, "games", gameId);
  const privRef = doc(db, "games", gameId, "private", user.uid);

  showOverlay("Escuchando estado de la partida…");

  let lastGame = null;
  let lastPriv = null;
  let ensuredMyHand = false;
  let ensuredBotHand = false;
  let lastSeenHandNo = null;

  let leaderboardApplyInFlight = false;
  let leaderboardAttemptedKey = "";
  let leaderboardLastError = "";

  const BOT_UID = "BOT";
  let botTimer = null;
  let botActInFlight = false;

  const TABLE_HOLD_MS = 5000;
  let tablePauseUntil = 0;
  let tableWinnerMsgUntil = 0;
  let tableWinnerTimer = null;
  let lastDealKey = "";
  let lastNonEmptyTable = [];
  let lastNonEmptyTableAt = 0;
  let lastNonEmptyTableHandNo = 0;
  let lastNonEmptyTableTrickNo = 0;
  let lastCompletedTrickTable = [];
  let lastCompletedTrickAt = 0;
  let lastCompletedTrickHandNo = 0;
  let lastCompletedTrickNo = 0;
  let tableHoldTimer = null;
  let pauseRerenderTimer = null;

  function clearPauseRerender() {
    if (pauseRerenderTimer) {
      clearTimeout(pauseRerenderTimer);
      pauseRerenderTimer = null;
    }
  }

  function schedulePauseRerender() {
    clearPauseRerender();
    const remaining = tablePauseUntil - Date.now();
    if (remaining <= 0) return;
    pauseRerenderTimer = setTimeout(() => {
      pauseRerenderTimer = null;
      try {
        renderHandFromCache();
      } catch {
      }
      try {
        if (lastGame) renderTableSlots(tableEl, lastGame, user.uid);
      } catch {
      }
    }, remaining + 20);
  }

  function isPointsMode(g) {
    return String(g?.matchMode || "hands") === "points";
  }

  function isBotGame(g) {
    const players = Array.isArray(g?.players) ? g.players : [];
    return players.some((p) => p?.uid === BOT_UID);
  }

  function botStrength(g) {
    const handNo = Number(g?.handNo || 1);
    const ok = Number(g?.botHandNo || 0) === handNo;
    const hand = ok && Array.isArray(g?.botHand) ? g.botHand : [];
    const pows = hand.map((cid) => Number(cardPower.get(cid) || 0));
    const max = pows.length ? Math.max(...pows) : 0;
    const sum = pows.reduce((a, b) => a + b, 0);
    const avg = pows.length ? sum / pows.length : 0;
    const envido = hand.length ? computeEnvidoScore(hand, envidoMetaById) : 0;
    return { hand, maxPow: max, avgPow: avg, envidoScore: envido };
  }

  async function ensureBotHandForHand(g) {
    if (!isBotGame(g)) return;
    const handNo = Number(g?.handNo || 1);
    if (Number(g?.botHandNo || 0) === handNo && Array.isArray(g?.botHand) && g.botHand.length) return;
    if (!Array.isArray(g?.deck) || !g.deck.length) return;
    const players = Array.isArray(g.players) ? g.players : [];
    const botIdx = players.findIndex((p) => p?.uid === BOT_UID);
    if (botIdx < 0) return;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(pubRef);
      if (!snap.exists()) return;
      const gg = snap.data();
      const hn = Number(gg?.handNo || 1);
      if (gg?.status !== "playing") return;
      if (Number(gg?.botHandNo || 0) === hn && Array.isArray(gg?.botHand) && gg.botHand.length) return;
      if (!Array.isArray(gg?.deck) || !gg.deck.length) return;
      const pls = Array.isArray(gg.players) ? gg.players : [];
      const bIdx = pls.findIndex((p) => p?.uid === BOT_UID);
      if (bIdx < 0) return;
      const botHand = bIdx === 0 ? gg.deck.slice(0, 3) : gg.deck.slice(3, 6);
      tx.update(pubRef, { botHand, botHandNo: hn });
    });
  }

  async function botRespondToCall(accept) {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(pubRef);
      if (!snap.exists()) throw new Error("Partida inexistente.");
      const g = snap.data();
      const cp = g.callPending;
      if (!cp) throw new Error("No hay canto pendiente.");
      if (cp.toUid !== BOT_UID) throw new Error("No le toca responder al bot.");

      if (!accept) {
        if (cp.kind === "envido") {
          tx.update(pubRef, {
            callPending: null,
            envido: { state: "none" }
          });
          await applyPointsDelta(tx, g, cp.fromUid, Number(cp.declineValue || 1));
          return;
        }

        if (cp.kind === "truco") {
          const delta = Number(cp.declineValue || 1);
          const updates = {
            callPending: null,
            status: "finished",
            turnUid: null,
            finishedWinnerUid: cp.fromUid
          };
          tx.update(pubRef, updates);
          await applyPointsDelta(tx, g, cp.fromUid, delta);
          return;
        }
      }

      if (cp.kind === "truco") {
        tx.update(pubRef, {
          callPending: null,
          trucoValue: Number(cp.offeredValue || 1),
          trucoLastRaiseUid: cp.fromUid
        });
        return;
      }

      if (cp.kind === "envido") {
        tx.update(pubRef, {
          callPending: null,
          envido: {
            state: "waiting_declare",
            stake: Number(cp.offeredValue || 0),
            declaredByUid: {},
            lastResult: null
          }
        });
        return;
      }
    });
  }

  async function botCounterEnvido(label) {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(pubRef);
      if (!snap.exists()) throw new Error("Partida inexistente.");
      const g = snap.data();
      const cp = g.callPending;
      if (!cp || cp.kind !== "envido") throw new Error("No hay envido para contracantar.");
      if (cp.toUid !== BOT_UID) throw new Error("No le toca al bot.");
      if (g.firstCardPlayed) throw new Error("El envido se canta antes de jugar la primera carta.");
      if (g.envido && g.envido.state !== "none") throw new Error("Ya se jugó el envido en esta mano.");

      const current = Number(cp.offeredValue || 0);
      let nextOffer = 0;
      const base = envidoBaseValue(label);
      if (label === "falta_envido") {
        const players = Array.isArray(g.players) ? g.players : [];
        const pb = (g.pointsByUid && typeof g.pointsByUid === "object") ? g.pointsByUid : {};
        const maxPts = Math.max(...players.map((p) => Number(pb[p.uid] || 0)));
        nextOffer = Math.max(1, Number(g.targetPoints || 0) - maxPts);
      } else {
        nextOffer = current + Number(base || 0);
      }

      tx.update(pubRef, {
        callPending: {
          kind: "envido",
          offer: label,
          fromUid: BOT_UID,
          toUid: cp.fromUid,
          offeredValue: nextOffer,
          declineValue: current,
          ts: Date.now()
        }
      });
    });
  }

  async function botCounterTruco(kind) {
    const next = trucoNextValue(kind);
    if (!next) return;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(pubRef);
      if (!snap.exists()) throw new Error("Partida inexistente.");
      const g = snap.data();
      const cp = g.callPending;
      if (!cp || cp.kind !== "truco") throw new Error("No hay truco para contracantar.");
      if (cp.toUid !== BOT_UID) throw new Error("No le toca al bot.");

      const acceptedNow = Number(cp.offeredValue || 1);
      if (Number(g.trucoValue || 1) !== acceptedNow) {
        tx.update(pubRef, { trucoValue: acceptedNow, trucoLastRaiseUid: cp.fromUid });
      }

      tx.update(pubRef, {
        callPending: {
          kind: "truco",
          offer: kind,
          fromUid: BOT_UID,
          toUid: cp.fromUid,
          offeredValue: next,
          declineValue: acceptedNow,
          ts: Date.now()
        },
        trucoLastRaiseUid: BOT_UID
      });
    });
  }

  async function botStartEnvido(label) {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(pubRef);
      if (!snap.exists()) throw new Error("Partida inexistente.");
      const g = snap.data();
      if (g.matchWinnerUid) throw new Error("La partida ya terminó.");
      if (g.status !== "playing") throw new Error("La mano no está en juego.");
      if (g.callPending) throw new Error("Ya hay un canto pendiente.");
      if (g.firstCardPlayed) throw new Error("El envido se canta antes de jugar la primera carta.");
      if (g.envido && g.envido.state !== "none") throw new Error("Ya se jugó el envido en esta mano.");

      const players = Array.isArray(g.players) ? g.players : [];
      const other = players.find((p) => p?.uid && p.uid !== BOT_UID);
      if (!other?.uid) throw new Error("Falta rival.");

      let offerValue = 0;
      if (label === "falta_envido") {
        const pb = (g.pointsByUid && typeof g.pointsByUid === "object") ? g.pointsByUid : {};
        const maxPts = Math.max(...players.map((p) => Number(pb[p.uid] || 0)));
        offerValue = Math.max(1, Number(g.targetPoints || 0) - maxPts);
      } else {
        offerValue = Number(envidoBaseValue(label) || 0);
      }

      tx.update(pubRef, {
        callPending: {
          kind: "envido",
          offer: label,
          fromUid: BOT_UID,
          toUid: other.uid,
          offeredValue: offerValue,
          declineValue: 1,
          ts: Date.now()
        }
      });
    });
  }

  async function botStartTruco(kind) {
    const next = trucoNextValue(kind);
    if (!next) return;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(pubRef);
      if (!snap.exists()) throw new Error("Partida inexistente.");
      const g = snap.data();
      if (g.matchWinnerUid) throw new Error("La partida ya terminó.");
      if (g.status !== "playing") throw new Error("La mano no está en juego.");
      if (g.callPending) throw new Error("Ya hay un canto pendiente.");

      const players = Array.isArray(g.players) ? g.players : [];
      const other = players.find((p) => p?.uid && p.uid !== BOT_UID);
      if (!other?.uid) throw new Error("Falta rival.");

      const current = Number(g.trucoValue || 1);
      if (next !== current + 1 && !(current === 1 && next === 2)) throw new Error("No se puede cantar eso ahora.");
      if (g.trucoLastRaiseUid === BOT_UID) throw new Error("Le toca al rival.");

      tx.update(pubRef, {
        callPending: {
          kind: "truco",
          offer: kind,
          fromUid: BOT_UID,
          toUid: other.uid,
          offeredValue: next,
          declineValue: current,
          ts: Date.now()
        },
        trucoLastRaiseUid: BOT_UID
      });
    });
  }

  async function maybeDeclareBotEnvido(g) {
    if (!isBotGame(g)) return;
    if (!g?.envido || g.envido.state !== "waiting_declare") return;
    const players = Array.isArray(g.players) ? g.players : [];
    if (players.length !== 2) return;

    const handNo = Number(g?.handNo || 1);
    if (Number(g?.botHandNo || 0) !== handNo) return;
    const botHand = Array.isArray(g?.botHand) ? g.botHand : [];
    if (botHand.length < 3) return;

    const declared = (g.envido.declaredByUid && typeof g.envido.declaredByUid === "object") ? g.envido.declaredByUid : {};
    if (declared[BOT_UID] != null) return;

    const score = computeEnvidoScore(botHand, envidoMetaById);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(pubRef);
      if (!snap.exists()) return;
      const gg = snap.data();
      if (!gg?.envido || gg.envido.state !== "waiting_declare") return;

      const pl = Array.isArray(gg.players) ? gg.players : [];
      if (pl.length !== 2) return;

      const d = (gg.envido.declaredByUid && typeof gg.envido.declaredByUid === "object") ? { ...gg.envido.declaredByUid } : {};
      if (d[BOT_UID] == null) d[BOT_UID] = score;

      const u0 = pl[0].uid;
      const u1 = pl[1].uid;
      const s0 = Number(d[u0] ?? -1);
      const s1 = Number(d[u1] ?? -1);
      const stake = Number(gg.envido.stake || 0);

      if (s0 >= 0 && s1 >= 0 && stake > 0) {
        const winnerUid = s0 > s1 ? u0 : (s1 > s0 ? u1 : String(gg.handUid || u0));
        const pb = (gg.pointsByUid && typeof gg.pointsByUid === "object") ? { ...gg.pointsByUid } : {};
        pb[winnerUid] = Number(pb[winnerUid] || 0) + stake;

        const upd = {
          pointsByUid: pb,
          envido: {
            state: "none",
            lastResult: {
              stake,
              winnerUid,
              scoresByUid: { [u0]: s0, [u1]: s1 }
            }
          }
        };
        const tgt = Number(gg.targetPoints || 0);
        if (tgt > 0 && pb[winnerUid] >= tgt) {
          upd.matchWinnerUid = winnerUid;
        }
        tx.update(pubRef, upd);
      } else {
        tx.update(pubRef, { envido: { ...gg.envido, declaredByUid: d } });
      }
    });
  }

  async function botPlayCard(cardId) {
    await runTransaction(db, async (tx) => {
      const gameSnap = await tx.get(pubRef);
      if (!gameSnap.exists()) throw new Error("Partida inexistente.");
      const g = gameSnap.data();

      if (g.status !== "playing") throw new Error("La partida no está en juego.");
      if (g.matchWinnerUid) throw new Error("La partida ya terminó.");
      if (g.callPending) throw new Error("Hay un canto pendiente.");
      if (g.envido && g.envido.state === "waiting_declare") throw new Error("Resolviendo envido…");
      if (g.turnUid !== BOT_UID) throw new Error("No es turno del bot.");

      const handNo = Number(g?.handNo || 1);
      const okHand = Number(g?.botHandNo || 0) === handNo;
      let hand = okHand && Array.isArray(g?.botHand) ? g.botHand.slice() : [];
      if (!hand.length && Array.isArray(g?.deck) && g.deck.length) {
        const players = Array.isArray(g.players) ? g.players : [];
        const botIdx = players.findIndex((p) => p?.uid === BOT_UID);
        if (botIdx >= 0) {
          hand = botIdx === 0 ? g.deck.slice(0, 3) : g.deck.slice(3, 6);
        }
      }

      let pick = String(cardId || "").trim();
      if (!pick) {
        const playsNow = (g.trickPlays && typeof g.trickPlays === "object") ? g.trickPlays : {};
        const otherId = Object.entries(playsNow).find(([uid]) => uid !== BOT_UID)?.[1] || "";
        const otherPow = otherId ? Number(cardPower.get(otherId) || 0) : null;
        const sorted = hand.slice().sort((a, b) => (Number(cardPower.get(a) || 0) - Number(cardPower.get(b) || 0)));
        pick = sorted[0] || "";
        if (otherPow != null) {
          const winning = sorted.find((cid) => Number(cardPower.get(cid) || 0) > otherPow);
          pick = winning || sorted[0] || "";
        }
      }

      const idx = hand.indexOf(pick);
      if (idx === -1) throw new Error("Carta inválida del bot.");

      const trickNo = Number(g.trickNo || 1);
      const plays = (g.trickPlays && typeof g.trickPlays === "object") ? { ...g.trickPlays } : {};
      if (plays[BOT_UID]) throw new Error("El bot ya jugó en esta baza.");

      hand.splice(idx, 1);

      const table = Array.isArray(g.table) ? g.table.slice() : [];
      table.push({ uid: BOT_UID, cardId: pick, trickNo });
      plays[BOT_UID] = pick;

      const nextUid = otherUid(g, BOT_UID);
      let nextTurnUid = nextUid || BOT_UID;
      let nextStatus = g.status;
      let nextTrickNo = trickNo;
      let nextPlays = plays;
      let nextTable = table;
      let trickWinners = Array.isArray(g.trickWinners) ? g.trickWinners.slice() : [];
      let trickHistory = Array.isArray(g.trickHistory) ? g.trickHistory.slice() : [];
      let finishedWinnerUid = g.finishedWinnerUid ?? null;

      const playedUids = Object.keys(plays);
      if (playedUids.length >= 2) {
        const aUid = playedUids[0];
        const bUid = playedUids[1];
        const aCard = plays[aUid];
        const bCard = plays[bUid];
        const aPow = cardPower.get(aCard) ?? 0;
        const bPow = cardPower.get(bCard) ?? 0;
        const winner = aPow >= bPow ? aUid : bUid;
        trickWinners.push(winner);
        trickHistory.push({ trickNo, plays: { ...plays }, winnerUid: winner });
        nextTurnUid = winner;
        nextTrickNo = trickNo + 1;
        nextPlays = {};
        nextTable = [];

        const winsA = trickWinners.filter((x) => x === aUid).length;
        const winsB = trickWinners.filter((x) => x === bUid).length;
        const done = winsA >= 2 || winsB >= 2 || nextTrickNo > 3;
        if (done) {
          nextStatus = "finished";
          nextTurnUid = null;
          finishedWinnerUid = winsA >= winsB ? aUid : bUid;
        }
      }

      const update = {
        table: nextTable,
        trickPlays: nextPlays,
        trickNo: nextTrickNo,
        turnUid: nextTurnUid,
        status: nextStatus,
        trickWinners,
        trickHistory,
        finishedWinnerUid,
        firstCardPlayed: true,
        botHand: hand,
        botHandNo: handNo
      };

      if (nextStatus === "finished") {
        const mode = String(g.matchMode || "hands");
        if (mode === "points" && g.targetPoints && finishedWinnerUid) {
          const pb = (g.pointsByUid && typeof g.pointsByUid === "object") ? { ...g.pointsByUid } : {};
          const stake = Number(g.trucoValue || 1);
          pb[finishedWinnerUid] = Number(pb[finishedWinnerUid] || 0) + stake;
          update.pointsByUid = pb;

          const tgt = Number(g.targetPoints || 0);
          if (tgt > 0 && pb[finishedWinnerUid] >= tgt) {
            update.matchWinnerUid = finishedWinnerUid;
          }
        }
      }

      tx.update(pubRef, update);
    });
  }

  function scheduleBotAct() {
    if (botTimer) return;
    let delay = 650;
    const g = lastGame;
    const blocked = !!g?.callPending || (g?.envido && g.envido.state === "waiting_declare");
    if (!blocked) {
      const remaining = tablePauseUntil - Date.now();
      if (remaining > 0) delay = Math.max(delay, remaining);
    }
    botTimer = setTimeout(() => {
      botTimer = null;
      void maybeBotAct();
    }, delay);
  }

  async function maybeBotAct() {
    if (botActInFlight) return;
    botActInFlight = true;
    let acted = false;
    try {
      const g = lastGame;
      if (!g) return;
      if (!isBotGame(g)) return;
      if (g.matchWinnerUid) return;
      if (g.status !== "playing") return;

      const paused = Date.now() < tablePauseUntil;
      const blocked = !!g.callPending || (g.envido && g.envido.state === "waiting_declare");
      if (paused && g.turnUid === BOT_UID && !blocked) return;

      await ensureBotHandForHand(g);

      const { hand, maxPow, envidoScore } = botStrength(g);

      if (g.envido && g.envido.state === "waiting_declare") {
        await maybeDeclareBotEnvido(g);
        return;
      }

      const cp = g.callPending;
      if (cp && cp.toUid === BOT_UID) {
        if (cp.kind === "envido") {
          if (envidoScore >= 32 && cp.offer !== "falta_envido") {
            await botCounterEnvido("falta_envido");
            acted = true;
            return;
          }
          if (envidoScore >= 29 && cp.offer === "envido") {
            await botCounterEnvido("real_envido");
            acted = true;
            return;
          }
          const accept = envidoScore >= 25;
          await botRespondToCall(accept);
          acted = true;
          return;
        }

        if (cp.kind === "truco") {
          const offered = Number(cp.offeredValue || 1);
          if (offered === 2 && maxPow >= 11) {
            await botCounterTruco("retruco");
            acted = true;
            return;
          }
          if (offered === 3 && maxPow >= 13) {
            await botCounterTruco("vale4");
            acted = true;
            return;
          }
          const accept = offered === 2 ? (maxPow >= 8) : (offered === 3 ? (maxPow >= 10) : (maxPow >= 12));
          await botRespondToCall(accept);
          acted = true;
          return;
        }
      }

      if (!cp && g.turnUid === BOT_UID) {
        if (!g.firstCardPlayed && (!g.envido || g.envido.state === "none")) {
          if (envidoScore >= 32 && Math.random() < 0.25) {
            await botStartEnvido("falta_envido");
            acted = true;
            return;
          }
          if (envidoScore >= 30 && Math.random() < 0.35) {
            await botStartEnvido("real_envido");
            acted = true;
            return;
          }
          if (envidoScore >= 27 && Math.random() < 0.55) {
            await botStartEnvido("envido");
            acted = true;
            return;
          }
        }

        const currentTrucoValue = Number(g.trucoValue || 1);
        const canRaiseTruco = g.trucoLastRaiseUid !== BOT_UID;
        if (currentTrucoValue === 1 && maxPow >= 9 && Math.random() < 0.35) {
          await botStartTruco("truco");
          acted = true;
          return;
        }
        if (currentTrucoValue === 2 && canRaiseTruco && maxPow >= 11 && Math.random() < 0.25) {
          await botStartTruco("retruco");
          acted = true;
          return;
        }
        if (currentTrucoValue === 3 && canRaiseTruco && maxPow >= 13 && Math.random() < 0.18) {
          await botStartTruco("vale4");
          acted = true;
          return;
        }

        await botPlayCard();
        acted = true;
      }
    } catch (e) {
      console.warn("bot act failed", e);
    } finally {
      botActInFlight = false;

      const g = lastGame;
      if (!acted && g && isBotGame(g) && g.status === "playing" && !g.matchWinnerUid) {
        const blocked = !!g.callPending || (g.envido && g.envido.state === "waiting_declare");
        if (!blocked && g.turnUid === BOT_UID) scheduleBotAct();
      }
    }
  }

  async function maybeApplyLeaderboard(g) {
    const winnerUid = String(g?.matchWinnerUid || "");
    if (!winnerUid) return;
    if (leaderboardApplyInFlight) return;
    const key = `${gameId}:${winnerUid}`;
    if (leaderboardAttemptedKey === key) return;

    leaderboardApplyInFlight = true;
    let ok = false;
    leaderboardLastError = "";

    try {
      await runTransaction(db, async (tx) => {
        const gameSnap = await tx.get(pubRef);
        if (!gameSnap.exists()) return;
        const gg = gameSnap.data();

        const wUid = String(gg?.matchWinnerUid || "");
        if (!wUid) return;

        const players = Array.isArray(gg.players) ? gg.players : [];
        if (players.length !== 2) return;
        const meInGame = players.some((p) => p?.uid === user.uid);
        if (!meInGame) return;

        const otherUidVal = String(players.find((p) => p?.uid && p.uid !== user.uid)?.uid || "");
        if (!otherUidVal) return;

        const nickByUid = new Map();
        for (const p of players) {
          if (p?.uid) nickByUid.set(p.uid, p.nickname || "");
        }

        const myUserRef = doc(db, "users", user.uid);
        const myLbRef = doc(db, "leaderboard", user.uid);

        const myUserSnap = await tx.get(myUserRef);
        const myData = myUserSnap.exists() ? myUserSnap.data() : null;

        const myStatsPrev = (myData?.stats && typeof myData.stats === "object") ? myData.stats : {};
        const already = String(myStatsPrev.lastMatchAppliedGameId || "") === String(gameId);
        if (already) return;

        const myElo = Number(myStatsPrev.elo ?? 1000);

        const k = 32;
        const expectedMe = 0.5;
        const scoreMe = user.uid === wUid ? 1 : 0;
        const nextElo = Math.round(myElo + k * (scoreMe - expectedMe));

        const nextStats = {
          wins: Number(myStatsPrev.wins ?? 0) + (scoreMe ? 1 : 0),
          losses: Number(myStatsPrev.losses ?? 0) + (scoreMe ? 0 : 1),
          elo: nextElo,
          lastMatchAppliedGameId: String(gameId)
        };

        const myNick = String(myData?.nickname || "") || String(nickByUid.get(user.uid) || "") || user.uid.slice(0, 6);
        tx.set(myUserRef, { nickname: myNick, stats: nextStats }, { merge: true });
        tx.set(myLbRef, { nickname: myNick, wins: nextStats.wins, losses: nextStats.losses, elo: nextStats.elo, updatedAt: serverTimestamp() }, { merge: true });
      });

      ok = true;
    } catch (e) {
      leaderboardLastError = e?.message || String(e);
      if (gameStatusEl) {
        gameStatusEl.style.color = "var(--danger)";
        setText(gameStatusEl, e?.message || String(e));
      }
    } finally {
      if (ok) leaderboardAttemptedKey = key;
      leaderboardApplyInFlight = false;
    }
  }

  function formatPendingCall(g, uid) {
    const cp = g?.callPending;
    if (!cp) return "";
    const from = cp.fromUid === uid ? "Vos" : "Rival";
    const kind = cp.kind;
    const offer = cp.offer;
    if (kind === "truco") {
      const label = offer === "truco" ? "Truco" : (offer === "retruco" ? "Retruco" : "Vale 4");
      return `${from} cantó ${label}.`;
    }
    if (kind === "envido") {
      const label = offer === "envido" ? "Envido" : (offer === "real_envido" ? "Real Envido" : "Falta Envido");
      return `${from} tocó ${label}.`;
    }
    return "";
  }

  function updateCantosUI(g) {
    if (!callStatusEl) return;

    const pointsMode = isPointsMode(g);
    const playing = g?.status === "playing" && !g?.matchWinnerUid;
    const pending = !!g?.callPending;

    if (!pointsMode) {
      callStatusEl.style.color = "var(--muted)";
      setText(callStatusEl, "Cantos disponibles en modo Puntos.");
      if (callResponseRowEl) callResponseRowEl.style.display = "none";
      setCantoButtonsEnabled({ enabled: false, pointsMode: false });
      return;
    }

    if (!playing) {
      callStatusEl.style.color = "var(--muted)";
      setText(callStatusEl, "");
      if (callResponseRowEl) callResponseRowEl.style.display = "none";
      setCantoButtonsEnabled({ enabled: false, pointsMode: true });
      return;
    }

    const cp = g?.callPending;
    const amResponder = cp && cp.toUid === user.uid;
    if (callResponseRowEl) callResponseRowEl.style.display = amResponder ? "flex" : "none";

    callStatusEl.style.color = pending ? "var(--primary)" : "var(--muted)";
    setText(callStatusEl, pending ? formatPendingCall(g, user.uid) : "");

    const canEnvido = !g.firstCardPlayed && (!g.envido || g.envido.state === "none");
    const currentTrucoValue = Number(g.trucoValue || 1);
    const canRaiseTruco = g.trucoLastRaiseUid !== user.uid;

    const cantosLocked = pending && !amResponder;

    if (btnEnvidoEl) btnEnvidoEl.disabled = !playing || cantosLocked || !canEnvido;
    if (btnRealEnvidoEl) btnRealEnvidoEl.disabled = !playing || cantosLocked || !canEnvido;
    if (btnFaltaEnvidoEl) btnFaltaEnvidoEl.disabled = !playing || cantosLocked || !canEnvido;

    if (pending && amResponder && cp.kind === "envido") {
      if (btnEnvidoEl) btnEnvidoEl.disabled = !playing || !canEnvido;
      if (btnRealEnvidoEl) btnRealEnvidoEl.disabled = !playing || !canEnvido;
      if (btnFaltaEnvidoEl) btnFaltaEnvidoEl.disabled = !playing || !canEnvido;
    }

    if (btnTrucoEl) btnTrucoEl.disabled = !playing || cantosLocked || currentTrucoValue !== 1;
    if (btnRetrucoEl) btnRetrucoEl.disabled = !playing || cantosLocked || currentTrucoValue !== 2 || !canRaiseTruco;
    if (btnVale4El) btnVale4El.disabled = !playing || cantosLocked || currentTrucoValue !== 3 || !canRaiseTruco;

    if (pending && amResponder && cp.kind === "truco") {
      const offered = Number(cp.offeredValue || 1);
      if (btnTrucoEl) btnTrucoEl.disabled = true;
      if (btnRetrucoEl) btnRetrucoEl.disabled = offered !== 2;
      if (btnVale4El) btnVale4El.disabled = offered !== 3;
    }
  }

  async function applyPointsDelta(tx, g, winnerUid, delta) {
    const pb = (g.pointsByUid && typeof g.pointsByUid === "object") ? { ...g.pointsByUid } : {};
    pb[winnerUid] = Number(pb[winnerUid] || 0) + Number(delta || 0);
    const update = { pointsByUid: pb };
    const tgt = Number(g.targetPoints || 0);
    if (tgt > 0 && pb[winnerUid] >= tgt) {
      update.matchWinnerUid = winnerUid;
    }
    tx.update(pubRef, update);
  }

  async function setPendingCall({ kind, offer, fromUid, toUid, offeredValue, declineValue }) {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(pubRef);
      if (!snap.exists()) throw new Error("Partida inexistente.");
      const g = snap.data();
      if (g.matchWinnerUid) throw new Error("La partida ya terminó.");
      if (g.status !== "playing") throw new Error("La mano no está en juego.");
      if (g.callPending) throw new Error("Ya hay un canto pendiente.");

      if (kind === "envido") {
        if (g.firstCardPlayed) throw new Error("El envido se canta antes de jugar la primera carta.");
        if (g.envido && g.envido.state !== "none") throw new Error("Ya se jugó el envido en esta mano.");
      }

      tx.update(pubRef, {
        callPending: {
          kind,
          offer,
          fromUid,
          toUid,
          offeredValue,
          declineValue,
          ts: Date.now()
        }
      });
    });
  }

  async function counterOrStartEnvido(kind) {
    const label = kind;
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(pubRef);
      if (!snap.exists()) throw new Error("Partida inexistente.");
      const g = snap.data();
      if (g.matchWinnerUid) throw new Error("La partida ya terminó.");
      if (String(g.matchMode || "hands") !== "points") throw new Error("Cantos disponibles solo en modo Puntos.");
      if (g.status !== "playing") throw new Error("La mano no está en juego.");
      if (g.firstCardPlayed) throw new Error("El envido se canta antes de jugar la primera carta.");
      if (g.envido && g.envido.state !== "none") throw new Error("Ya se jugó el envido en esta mano.");

      const players = Array.isArray(g.players) ? g.players : [];
      const other = players.find((p) => p?.uid && p.uid !== user.uid);
      if (!other?.uid) throw new Error("Falta rival.");

      const cp = g.callPending;
      if (cp) {
        if (cp.kind !== "envido") throw new Error("Hay otro canto pendiente.");
        if (cp.toUid !== user.uid) throw new Error("Esperá la respuesta del rival.");

        const current = Number(cp.offeredValue || 0);
        let nextOffer = 0;
        const base = envidoBaseValue(label);
        if (label === "falta_envido") {
          const pb = (g.pointsByUid && typeof g.pointsByUid === "object") ? g.pointsByUid : {};
          const maxPts = Math.max(...players.map((p) => Number(pb[p.uid] || 0)));
          nextOffer = Math.max(1, Number(g.targetPoints || 0) - maxPts);
        } else {
          nextOffer = current + Number(base || 0);
        }

        tx.update(pubRef, {
          callPending: {
            kind: "envido",
            offer: label,
            fromUid: user.uid,
            toUid: cp.fromUid,
            offeredValue: nextOffer,
            declineValue: current,
            ts: Date.now()
          }
        });
        return;
      }

      let offerValue = 0;
      if (label === "falta_envido") {
        const pb = (g.pointsByUid && typeof g.pointsByUid === "object") ? g.pointsByUid : {};
        const maxPts = Math.max(...players.map((p) => Number(pb[p.uid] || 0)));
        offerValue = Math.max(1, Number(g.targetPoints || 0) - maxPts);
      } else {
        offerValue = Number(envidoBaseValue(label) || 0);
      }
      tx.update(pubRef, {
        callPending: {
          kind: "envido",
          offer: label,
          fromUid: user.uid,
          toUid: other.uid,
          offeredValue: offerValue,
          declineValue: 1,
          ts: Date.now()
        }
      });
    });
  }

  async function counterOrStartTruco(kind) {
    const next = trucoNextValue(kind);
    if (!next) return;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(pubRef);
      if (!snap.exists()) throw new Error("Partida inexistente.");
      const g = snap.data();
      if (g.matchWinnerUid) throw new Error("La partida ya terminó.");
      if (String(g.matchMode || "hands") !== "points") throw new Error("Cantos disponibles solo en modo Puntos.");
      if (g.status !== "playing") throw new Error("La mano no está en juego.");

      const players = Array.isArray(g.players) ? g.players : [];
      const other = players.find((p) => p?.uid && p.uid !== user.uid);
      if (!other?.uid) throw new Error("Falta rival.");

      const cp = g.callPending;
      if (cp) {
        if (cp.kind !== "truco") throw new Error("Hay otro canto pendiente.");
        if (cp.toUid !== user.uid) throw new Error("Esperá la respuesta del rival.");

        const acceptedNow = Number(cp.offeredValue || 1);
        if (Number(g.trucoValue || 1) !== acceptedNow) {
          tx.update(pubRef, { trucoValue: acceptedNow, trucoLastRaiseUid: cp.fromUid });
        }
        tx.update(pubRef, {
          callPending: {
            kind: "truco",
            offer: kind,
            fromUid: user.uid,
            toUid: cp.fromUid,
            offeredValue: next,
            declineValue: acceptedNow,
            ts: Date.now()
          },
          trucoLastRaiseUid: user.uid
        });
        return;
      }

      const current = Number(g.trucoValue || 1);
      if (next !== current + 1 && !(current === 1 && next === 2)) throw new Error("No se puede cantar eso ahora.");
      if (g.trucoLastRaiseUid === user.uid) throw new Error("Le toca al rival.");

      tx.update(pubRef, {
        callPending: {
          kind: "truco",
          offer: kind,
          fromUid: user.uid,
          toUid: other.uid,
          offeredValue: next,
          declineValue: current,
          ts: Date.now()
        },
        trucoLastRaiseUid: user.uid
      });
    });
  }

  async function respondToCall(accept) {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(pubRef);
      if (!snap.exists()) throw new Error("Partida inexistente.");
      const g = snap.data();
      const cp = g.callPending;
      if (!cp) throw new Error("No hay canto pendiente.");
      if (cp.toUid !== user.uid) throw new Error("No te toca responder.");

      if (!accept) {
        if (cp.kind === "envido") {
          tx.update(pubRef, {
            callPending: null,
            envido: { state: "none" }
          });
          await applyPointsDelta(tx, g, cp.fromUid, Number(cp.declineValue || 1));
          return;
        }

        if (cp.kind === "truco") {
          const delta = Number(cp.declineValue || 1);
          const updates = {
            callPending: null,
            status: "finished",
            turnUid: null,
            finishedWinnerUid: cp.fromUid
          };

          tx.update(pubRef, updates);
          await applyPointsDelta(tx, g, cp.fromUid, delta);
          return;
        }
      }

      if (cp.kind === "truco") {
        tx.update(pubRef, {
          callPending: null,
          trucoValue: Number(cp.offeredValue || 1),
          trucoLastRaiseUid: cp.fromUid
        });
        return;
      }

      if (cp.kind === "envido") {
        tx.update(pubRef, {
          callPending: null,
          envido: {
            state: "waiting_declare",
            stake: Number(cp.offeredValue || 0),
            declaredByUid: {},
            lastResult: null
          }
        });
        return;
      }
    });
  }

  async function maybeDeclareEnvido(g) {
    if (!g?.envido || g.envido.state !== "waiting_declare") return;
    const players = Array.isArray(g.players) ? g.players : [];
    if (players.length !== 2) return;

    const declared = (g.envido.declaredByUid && typeof g.envido.declaredByUid === "object") ? g.envido.declaredByUid : {};
    if (declared[user.uid] != null) return;

    const hand = Array.isArray(lastPriv?.hand) ? lastPriv.hand : [];
    if (hand.length < 3) return;
    const score = computeEnvidoScore(hand, envidoMetaById);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(pubRef);
      if (!snap.exists()) return;
      const gg = snap.data();
      if (!gg?.envido || gg.envido.state !== "waiting_declare") return;

      const pl = Array.isArray(gg.players) ? gg.players : [];
      if (pl.length !== 2) return;

      const d = (gg.envido.declaredByUid && typeof gg.envido.declaredByUid === "object") ? { ...gg.envido.declaredByUid } : {};
      if (d[user.uid] == null) d[user.uid] = score;

      const u0 = pl[0].uid;
      const u1 = pl[1].uid;
      const s0 = Number(d[u0] ?? -1);
      const s1 = Number(d[u1] ?? -1);
      const stake = Number(gg.envido.stake || 0);

      if (s0 >= 0 && s1 >= 0 && stake > 0) {
        const winnerUid = s0 > s1 ? u0 : (s1 > s0 ? u1 : String(gg.handUid || u0));
        const pb = (gg.pointsByUid && typeof gg.pointsByUid === "object") ? { ...gg.pointsByUid } : {};
        pb[winnerUid] = Number(pb[winnerUid] || 0) + stake;

        const upd = {
          pointsByUid: pb,
          envido: {
            state: "none",
            lastResult: {
              stake,
              winnerUid,
              scoresByUid: { [u0]: s0, [u1]: s1 }
            }
          }
        };
        const tgt = Number(gg.targetPoints || 0);
        if (tgt > 0 && pb[winnerUid] >= tgt) {
          upd.matchWinnerUid = winnerUid;
        }
        tx.update(pubRef, upd);
      } else {
        tx.update(pubRef, { envido: { ...gg.envido, declaredByUid: d } });
      }
    });
  }

  async function onHandCardClick(cid) {
    try {
      handHintEl.style.color = "var(--muted)";
      setText(handHintEl, "Jugando…");
      await playCard({ gameId, user, cardId: cid, cardPower });
      setText(handHintEl, "");
    } catch (e) {
      handHintEl.style.color = "var(--danger)";
      setText(handHintEl, e?.message || String(e));
    }
  }

  function animateDealToHand(cardIds) {
    try {
      const ids = Array.isArray(cardIds) ? cardIds.filter(Boolean) : [];
      if (ids.length !== 3) return;
      if (!handEl || !tableEl) return;
      if (document.visibilityState && document.visibilityState !== "visible") return;

      const targetImgs = Array.from(handEl.querySelectorAll("button img"));
      if (targetImgs.length < 3) return;

      const tRect = tableEl.getBoundingClientRect();
      const sx = tRect.left + tRect.width / 2;
      const sy = tRect.top + Math.min(tRect.height / 2, 80);

      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.left = "0";
      overlay.style.top = "0";
      overlay.style.width = "100vw";
      overlay.style.height = "100vh";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "9999";
      document.body.appendChild(overlay);

      const prevHandPointer = handEl.style.pointerEvents;
      handEl.style.pointerEvents = "none";

      let done = 0;
      const finishAll = () => {
        try {
          if (overlay && overlay.isConnected) overlay.remove();
        } catch {
        }
        try {
          handEl.style.pointerEvents = prevHandPointer;
        } catch {
        }
      };

      const safety = setTimeout(() => {
        for (const img of targetImgs) {
          try { img.style.opacity = "1"; } catch {
          }
        }
        finishAll();
      }, 1800);

      for (let i = 0; i < 3; i++) {
        const imgEl = targetImgs[i];
        const rect = imgEl.getBoundingClientRect();
        const tw = rect.width || 86;
        const th = rect.height || Math.round(tw * 1.39);
        const tx = rect.left + rect.width / 2;
        const ty = rect.top + rect.height / 2;

        imgEl.style.opacity = "0";

        const ghost = document.createElement("img");
        setCardImg(ghost, ids[i]);
        ghost.style.position = "absolute";
        ghost.style.width = `${tw}px`;
        ghost.style.height = `${th}px`;
        ghost.style.left = `${sx - tw / 2}px`;
        ghost.style.top = `${sy - th / 2}px`;
        ghost.style.borderRadius = "10px";
        ghost.style.boxShadow = "0 14px 36px rgba(0,0,0,0.35)";
        overlay.appendChild(ghost);

        const dx = tx - sx;
        const dy = ty - sy;

        const anim = ghost.animate([
          { transform: "translate(0px, 0px) scale(0.85)", opacity: 0 },
          { transform: `translate(${dx * 0.85}px, ${dy * 0.85}px) scale(1.03)`, opacity: 1, offset: 0.75 },
          { transform: `translate(${dx}px, ${dy}px) scale(1)`, opacity: 1 }
        ], {
          duration: 520,
          delay: i * 90,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
          fill: "forwards"
        });

        anim.finished.then(() => {
          try { ghost.remove(); } catch {
          }
          try { imgEl.style.opacity = "1"; } catch {
          }
          done += 1;
          if (done >= 3) {
            clearTimeout(safety);
            finishAll();
          }
        }).catch(() => {
          done += 1;
          if (done >= 3) {
            clearTimeout(safety);
            finishAll();
          }
        });
      }
    } catch {
    }
  }

  function renderHandFromCache() {
    const currentHandNo = Number(lastGame?.handNo || 1);
    const myHandNo = Number(lastPriv?.handNo || 0);
    const ok = myHandNo === currentHandNo;
    const hand = ok && Array.isArray(lastPriv?.hand) ? lastPriv.hand : [];
    const playing = lastGame?.status === "playing";
    const blocked = !!lastGame?.callPending || (lastGame?.envido && lastGame.envido.state === "waiting_declare");
    const paused = Date.now() < tablePauseUntil;
    const myTurn = playing && lastGame?.turnUid === user.uid && !blocked && !paused;

    renderCardStrip(handEl, hand.map((cid) => ({ cardId: cid })), {
      clickable: myTurn,
      onClick: onHandCardClick
    });

    const dealKey = (ok && hand.length === 3) ? `${currentHandNo}:${hand.join("|")}` : "";
    if (dealKey && dealKey !== lastDealKey) {
      lastDealKey = dealKey;
      queueMicrotask(() => animateDealToHand(hand));
    }

    if (!hand.length) {
      handHintEl.style.color = "var(--muted)";
      setText(handHintEl, playing ? "Esperando reparto…" : "");
      return;
    }

    if (playing && !myTurn) {
      handHintEl.style.color = "var(--muted)";
      if (!blocked && lastGame?.turnUid === user.uid && paused) setText(handHintEl, "Esperando…");
      else setText(handHintEl, blocked ? "Resolviendo canto…" : (lastGame?.turnUid === BOT_UID ? "Turno del bot…" : "No es tu turno."));
      return;
    }

    setText(handHintEl, "");
  }

  const unsubPub = onSnapshot(pubRef, async (snap) => {
    if (!snap.exists()) {
      if (publicStateEl) setText(publicStateEl, "(no existe)\n\nEn el MVP, este doc lo crea el backend (Paso 5).\n");
      setText(turnEl, "waiting");
      setText(gameStatusEl, "No existe la partida. Volvé al inicio y creala.");
      return;
    }
    const data = snap.data();
    lastGame = data;
    if (publicStateEl) setText(publicStateEl, JSON.stringify(data, null, 2));

    maybeApplyLeaderboard(data);
    updateCantosUI(data);
    maybeDeclareEnvido(data);
    maybeDeclareBotEnvido(data);

    const currentHandNo = Number(data.handNo || 1);
    if (lastSeenHandNo !== currentHandNo) {
      lastSeenHandNo = currentHandNo;
      ensuredMyHand = false;
      ensuredBotHand = false;
    }

    if (!ensuredMyHand && data.status === "playing" && Array.isArray(data.deck) && data.deck.length) {
      ensuredMyHand = true;
      try {
        await runTransaction(db, async (tx) => {
          const privSnap = await tx.get(privRef);
          if (privSnap.exists()) {
            const pd = privSnap.data();
            if (Number(pd?.handNo || 0) === Number(data.handNo || 1) && Array.isArray(pd?.hand) && pd.hand.length) return;
          }
          const players = Array.isArray(data.players) ? data.players : [];
          const myIdx = players.findIndex((p) => p && p.uid === user.uid);
          if (myIdx < 0) return;
          const myHand = myIdx === 0 ? data.deck.slice(0, 3) : data.deck.slice(3, 6);
          tx.set(privRef, { hand: myHand, handNo: Number(data.handNo || 1), createdAt: serverTimestamp() }, { merge: true });
        });
      } catch (e) {
        ensuredMyHand = false;
      }
    }

    const players = Array.isArray(data.players) ? data.players : [];
    const meInGame = players.some((p) => p && p.uid === user.uid);
    if (!meInGame && data.status === "waiting") {
      try {
        await ensureJoinedAndMaybeStart({ gameId, user, nickname, deck });
      } catch (e) {
        gameStatusEl.style.color = "var(--danger)";
        setText(gameStatusEl, e?.message || String(e));
      }
    }

    if (data.matchWinnerUid) {
      if (leaderboardLastError) {
        gameStatusEl.style.color = "var(--danger)";
        setText(gameStatusEl, `Partida terminada. Leaderboard: ${leaderboardLastError}`);
      } else {
        gameStatusEl.style.color = "var(--ok)";
        setText(gameStatusEl, "Partida terminada.");
      }
    } else if (data.status === "waiting") {
      gameStatusEl.style.color = "var(--muted)";
      setText(gameStatusEl, "Esperando al segundo jugador… Abrí otra pestaña/incógnito y usá el mismo código.");
    } else if (data.status === "finished") {
      gameStatusEl.style.color = "var(--ok)";
      setText(gameStatusEl, "Mano terminada.");
    } else {
      gameStatusEl.style.color = "";
      setText(gameStatusEl, "");
    }

    const currentHandNo2 = Number(data.handNo || 1);
    const currentTrickNo2 = Number(data.trickNo || 1);

    if (lastNonEmptyTableHandNo && currentHandNo2 !== lastNonEmptyTableHandNo) {
      lastNonEmptyTable = [];
      lastNonEmptyTableAt = 0;
      lastNonEmptyTableHandNo = 0;
      lastNonEmptyTableTrickNo = 0;
      lastCompletedTrickTable = [];
      lastCompletedTrickAt = 0;
      lastCompletedTrickHandNo = 0;
      lastCompletedTrickNo = 0;
      tablePauseUntil = 0;
      clearPauseRerender();
      tableWinnerMsgUntil = 0;
      if (tableWinnerTimer) {
        clearTimeout(tableWinnerTimer);
        tableWinnerTimer = null;
      }
      if (tableHoldTimer) {
        clearTimeout(tableHoldTimer);
        tableHoldTimer = null;
      }
    }

    const rawTable = Array.isArray(data.table) ? data.table : [];
    if (rawTable.length) {
      lastNonEmptyTable = rawTable.slice();
      lastNonEmptyTableAt = Date.now();
      lastNonEmptyTableHandNo = currentHandNo2;
      lastNonEmptyTableTrickNo = currentTrickNo2;
      if (tableHoldTimer) {
        clearTimeout(tableHoldTimer);
        tableHoldTimer = null;
      }
    }

    if (!rawTable.length) {
      const hist = Array.isArray(data.trickHistory) ? data.trickHistory : [];
      const last = hist.length ? hist[hist.length - 1] : null;
      const histTrickNo = Number(last?.trickNo || 0);
      const plays = (last?.plays && typeof last.plays === "object") ? last.plays : {};
      const entries = Object.entries(plays).filter(([, cid]) => !!cid);
      if (histTrickNo && (histTrickNo === currentTrickNo2 - 1 || histTrickNo === currentTrickNo2) && entries.length) {
        if (lastCompletedTrickHandNo !== currentHandNo2 || lastCompletedTrickNo !== histTrickNo) {
          lastCompletedTrickTable = entries.map(([uid, cardId]) => ({ uid, cardId, trickNo: histTrickNo }));
          lastCompletedTrickAt = Date.now();
          lastCompletedTrickHandNo = currentHandNo2;
          lastCompletedTrickNo = histTrickNo;
          tablePauseUntil = Math.max(tablePauseUntil, lastCompletedTrickAt + TABLE_HOLD_MS);
          schedulePauseRerender();

          if (tableWinnerEl) {
            const nick = nicknameByUid(data);
            const wuid = String(last?.winnerUid || "");
            let wname = wuid ? (nick.get(wuid) || wuid.slice(0, 6)) : "";
            if (wuid === BOT_UID) wname = "Bot";
            setText(tableWinnerEl, wname ? `Ganó la baza: ${wname}` : "");
            tableWinnerEl.style.color = "var(--muted)";
            tableWinnerMsgUntil = lastCompletedTrickAt + TABLE_HOLD_MS;
            if (tableWinnerTimer) clearTimeout(tableWinnerTimer);
            tableWinnerTimer = setTimeout(() => {
              tableWinnerTimer = null;
              if (Date.now() >= tableWinnerMsgUntil && tableWinnerEl) setText(tableWinnerEl, "");
            }, TABLE_HOLD_MS);
          }
        }
      }
    }

    if (tableWinnerEl) {
      if (data.matchWinnerUid) {
        const nick = nicknameByUid(data);
        const wuid = String(data.matchWinnerUid || "");
        let wname = wuid ? (nick.get(wuid) || wuid.slice(0, 6)) : "";
        if (wuid === BOT_UID) wname = "Bot";
        setText(tableWinnerEl, wname ? `Ganó la partida: ${wname}` : "");
        tableWinnerEl.style.color = "var(--ok)";
      } else if (data.status === "finished" && data.finishedWinnerUid) {
        const nick = nicknameByUid(data);
        const wuid = String(data.finishedWinnerUid || "");
        let wname = wuid ? (nick.get(wuid) || wuid.slice(0, 6)) : "";
        if (wuid === BOT_UID) wname = "Bot";
        setText(tableWinnerEl, wname ? `Ganó la mano: ${wname}` : "");
        tableWinnerEl.style.color = "var(--ok)";
      } else if (Date.now() >= tableWinnerMsgUntil) {
        setText(tableWinnerEl, "");
      }
    }

    let tableToRender = rawTable;
    if (!rawTable.length) {
      const now = Date.now();
      const canHoldHistory = lastCompletedTrickTable.length
        && currentHandNo2 === lastCompletedTrickHandNo
        && (currentTrickNo2 === lastCompletedTrickNo + 1 || currentTrickNo2 === lastCompletedTrickNo);
      const ageHist = canHoldHistory ? (now - lastCompletedTrickAt) : Number.POSITIVE_INFINITY;

      if (canHoldHistory && ageHist < TABLE_HOLD_MS) {
        tableToRender = lastCompletedTrickTable;
        const remaining = TABLE_HOLD_MS - ageHist;
        if (tableHoldTimer) clearTimeout(tableHoldTimer);
        tableHoldTimer = setTimeout(() => {
          tableHoldTimer = null;
          try {
            renderTableSlots(tableEl, lastGame, user.uid);
          } catch (e) {
            console.warn("renderTableSlots failed", e);
          }
        }, remaining);
      } else if (lastNonEmptyTable.length) {
        const age = now - lastNonEmptyTableAt;
        const holdable = currentHandNo2 === lastNonEmptyTableHandNo && (currentTrickNo2 === lastNonEmptyTableTrickNo + 1 || currentTrickNo2 === lastNonEmptyTableTrickNo);
        if (holdable && age < TABLE_HOLD_MS) {
          tableToRender = lastNonEmptyTable;
          const remaining = TABLE_HOLD_MS - age;
          if (tableHoldTimer) clearTimeout(tableHoldTimer);
          tableHoldTimer = setTimeout(() => {
            tableHoldTimer = null;
            try {
              renderTableSlots(tableEl, lastGame, user.uid);
            } catch (e) {
              console.warn("renderTableSlots failed", e);
            }
          }, remaining);
        }
      }
    }

    try {
      renderTableSlots(tableEl, { ...data, table: tableToRender }, user.uid);
    } catch (e) {
      console.warn("renderTableSlots failed", e);
    }

    const nick = nicknameByUid(data);
    const tuid = String(data.turnUid || "");
    const base = data.status || "";
    const isPlaying = data.status === "playing" && !data.matchWinnerUid;
    let turnTxt = base;
    if (isPlaying) {
      if (tuid === user.uid) turnTxt = "Tu turno";
      else if (tuid === BOT_UID) turnTxt = "Turno del bot";
      else if (tuid) turnTxt = `Turno de ${nick.get(tuid) || "rival"}`;
      else turnTxt = "";
    }
    setText(turnEl, turnTxt);
    renderNarrative({ game: data, myUid: user.uid });
    renderHandFromCache();
    hideOverlay();

    if (isBotGame(data)) scheduleBotAct();
  }, (err) => {
    showOverlay(err?.message || String(err));
  });

  const unsubPriv = onSnapshot(privRef, (snap) => {
    if (!snap.exists()) {
      setText(privateStateEl, "(no existe)\n\nEste doc privado lo escribe el backend al repartir.\n");
      setText(handHintEl, "Esperando reparto…");
      return;
    }
    const d = snap.data();
    lastPriv = d;
    setText(privateStateEl, JSON.stringify(d, null, 2));
    if (lastGame) maybeDeclareEnvido(lastGame);
    renderHandFromCache();
  });

  if (btnEnvidoEl) btnEnvidoEl.addEventListener("click", () => counterOrStartEnvido("envido"));
  if (btnRealEnvidoEl) btnRealEnvidoEl.addEventListener("click", () => counterOrStartEnvido("real_envido"));
  if (btnFaltaEnvidoEl) btnFaltaEnvidoEl.addEventListener("click", () => counterOrStartEnvido("falta_envido"));

  if (btnTrucoEl) btnTrucoEl.addEventListener("click", () => counterOrStartTruco("truco"));
  if (btnRetrucoEl) btnRetrucoEl.addEventListener("click", () => counterOrStartTruco("retruco"));
  if (btnVale4El) btnVale4El.addEventListener("click", () => counterOrStartTruco("vale4"));

  if (btnQuieroEl) btnQuieroEl.addEventListener("click", () => respondToCall(true));
  if (btnNoQuieroEl) btnNoQuieroEl.addEventListener("click", () => respondToCall(false));

  if (btnNextHandEl) {
    btnNextHandEl.addEventListener("click", async () => {
      try {
        btnNextHandEl.disabled = true;
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(pubRef);
          if (!snap.exists()) throw new Error("Partida inexistente.");
          const g = snap.data();

          if (g.matchWinnerUid) throw new Error("La partida ya terminó.");
          if (g.status !== "finished") throw new Error("La mano todavía no terminó.");

          const players = Array.isArray(g.players) ? g.players : [];
          if (players.length !== 2) throw new Error("Faltan jugadores.");

          const mode = String(g.matchMode || "hands");
          const handNo = Number(g.handNo || 1);
          const nextHandNo = handNo + 1;
          const firstUid = players[nextHandNo % 2].uid;
          const newDeck = shuffle(Array.isArray(g.deck) && g.deck.length ? g.deck : deck);

          if (mode === "points") {
            const botIdx = players.findIndex((p) => p?.uid === BOT_UID);
            const botHand = botIdx === 0 ? newDeck.slice(0, 3) : newDeck.slice(3, 6);
            tx.update(pubRef, {
              status: "playing",
              deck: newDeck,
              handNo: nextHandNo,
              handUid: firstUid,
              turnUid: firstUid,
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
              botHand: botIdx >= 0 ? botHand : null,
              botHandNo: botIdx >= 0 ? nextHandNo : null
            });
            return;
          }

          const handWinnerUid = g.finishedWinnerUid || "";
          if (!handWinnerUid) throw new Error("No se pudo determinar ganador de la mano.");

          const handWinners = Array.isArray(g.handWinners) ? g.handWinners.slice() : [];
          if (handWinners.length === handNo - 1) {
            handWinners.push(handWinnerUid);
          }

          const matchTargetWins = Number(g.matchTargetWins || 2);
          const winsByUid = {};
          for (const w of handWinners) {
            if (w) winsByUid[w] = (winsByUid[w] || 0) + 1;
          }
          const winnerUid = Object.entries(winsByUid).find(([, n]) => Number(n) >= matchTargetWins)?.[0] || "";

          if (winnerUid) {
            tx.update(pubRef, {
              handWinners,
              matchWinnerUid: winnerUid
            });
            return;
          }

          tx.update(pubRef, {
            status: "playing",
            deck: newDeck,
            handNo: nextHandNo,
            handUid: firstUid,
            handWinners,
            turnUid: firstUid,
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
        });
      } catch (e) {
        gameStatusEl.style.color = "var(--danger)";
        setText(gameStatusEl, e?.message || String(e));
      } finally {
        btnNextHandEl.disabled = false;
      }
    });
  }

  window.addEventListener("beforeunload", () => {
    unsubPub();
    unsubPriv();
  });
})();
