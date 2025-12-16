import { db, onAuth } from "../firebase.js";
import { ensureUserDoc, getUserDoc } from "../user_store.js";
import { qs, setText, setUserChip } from "../ui.js";
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const statusEl = qs("#status");
const rowsEl = qs("#rows");

const userChip = document.querySelector("#userChip");
const loginLink = qs("#loginLink");
const photoEl = document.querySelector("#userPhoto");
const nameEl = document.querySelector("#userName");
const logoutEl = document.querySelector("#btnLogout");

const SNAPSHOT_PERIOD_MS = 30 * 60 * 1000;
let countdownTimer = null;
let countdownBaseText = "";
let countdownNextAtMs = 0;

function clearCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  countdownBaseText = "";
  countdownNextAtMs = 0;
}

function fmtCountdownMs(ms) {
  try {
    const s = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

function startCountdown(baseText, nextAtMs) {
  clearCountdown();
  countdownBaseText = String(baseText || "");
  countdownNextAtMs = Number(nextAtMs || 0);

  const tick = () => {
    const left = countdownNextAtMs - Date.now();
    const t = fmtCountdownMs(left);
    setText(statusEl, `${countdownBaseText} — El ranking se actualizará en ${t}`);
  };

  tick();
  countdownTimer = setInterval(tick, 1000);
}

function fmtGeneratedAt(ts) {
  try {
    if (!ts) return "";
    const d = typeof ts.toDate === "function" ? ts.toDate() : null;
    if (!d) return "";
    return d.toLocaleString();
  } catch {
    return "";
  }
}

async function loadLeaderboard() {
  setText(statusEl, "Cargando…");
  rowsEl.innerHTML = "";
  clearCountdown();

  try {
    let items = null;

    try {
      const snapRef = doc(db, "leaderboardSnapshots", "current");
      const snapDoc = await getDoc(snapRef);
      if (snapDoc.exists()) {
        const d = snapDoc.data();
        const top = Array.isArray(d?.top) ? d.top : null;
        if (top && top.length) {
          items = top.map((x, idx) => ({
            rank: Number(x?.rank || idx + 1),
            uid: String(x?.uid || ""),
            nickname: String(x?.nickname || ""),
            elo: x?.elo ?? null,
            wins: x?.wins ?? 0,
            losses: x?.losses ?? 0
          }));
          const when = fmtGeneratedAt(d?.generatedAt);
          const base = when ? `Actualizado: ${when} (cada 30 min)` : "Actualizado (cada 30 min)";
          statusEl.style.color = "var(--muted)";
          const genDate = (d?.generatedAt && typeof d.generatedAt.toDate === "function") ? d.generatedAt.toDate() : null;
          if (genDate) {
            startCountdown(base, genDate.getTime() + SNAPSHOT_PERIOD_MS);
          } else {
            setText(statusEl, base);
          }
        }
      }
    } catch {
    }

    if (!items) {
      const q = query(collection(db, "leaderboard"), orderBy("elo", "desc"), limit(50));
      const snap = await getDocs(q);
      if (snap.empty) {
        setText(statusEl, "Todavía no hay partidas finalizadas.");
        return;
      }
      items = snap.docs.map((docSnap, idx) => {
        const d = docSnap.data();
        return {
          rank: idx + 1,
          uid: docSnap.id,
          nickname: d.nickname || docSnap.id,
          elo: d.elo ?? null,
          wins: d.wins ?? 0,
          losses: d.losses ?? 0
        };
      });
      setText(statusEl, "");
    }

    let i = 0;
    for (const it of items) {
      i++;
      const div = document.createElement("div");
      div.className = "panel";
      div.innerHTML = `
        <div class="row" style="align-items:center;">
          <div style="flex:0 0 auto;" class="badge">#${i}</div>
          <div style="flex:1;">
            <div style="font-weight:700;">${(it.nickname || it.uid || "-")}</div>
            <div class="small">Elo: <span class="mono">${it.elo ?? "-"}</span> — W/L: <span class="mono">${it.wins ?? 0}/${it.losses ?? 0}</span></div>
          </div>
        </div>
      `;
      rowsEl.appendChild(div);
    }
  } catch (e) {
    clearCountdown();
    statusEl.style.color = "var(--danger)";
    setText(statusEl, e?.message || String(e));
  }
}

onAuth(async (user) => {
  try {
    if (!user) {
      clearCountdown();
      if (userChip) userChip.style.display = "none";
      loginLink.style.display = "block";

      statusEl.style.color = "var(--muted)";
      setText(statusEl, "Entrá para ver el leaderboard.");
      rowsEl.innerHTML = "";
      return;
    } else {
      loginLink.style.display = "none";
      if (userChip) userChip.style.display = "flex";
      await ensureUserDoc(user);
      const { data } = await getUserDoc(user.uid);
      if (photoEl && nameEl && logoutEl) {
        setUserChip({ photoEl, nameEl, logoutEl }, user, data?.nickname || "");
      }
    }

    await loadLeaderboard();
  } catch (e) {
    statusEl.style.color = "var(--danger)";
    setText(statusEl, e?.message || String(e));
  }
});
