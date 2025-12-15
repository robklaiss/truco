import { db, onAuth } from "../firebase.js";
import { ensureUserDoc, getUserDoc } from "../user_store.js";
import { qs, setText, setUserChip } from "../ui.js";
import { collection, getDocs, limit, orderBy, query } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const statusEl = qs("#status");
const rowsEl = qs("#rows");

const userChip = document.querySelector("#userChip");
const loginLink = qs("#loginLink");
const photoEl = document.querySelector("#userPhoto");
const nameEl = document.querySelector("#userName");
const logoutEl = document.querySelector("#btnLogout");

async function loadLeaderboard() {
  setText(statusEl, "Cargando…");
  rowsEl.innerHTML = "";

  try {
    const q = query(collection(db, "leaderboard"), orderBy("elo", "desc"), limit(50));
    const snap = await getDocs(q);

    if (snap.empty) {
      setText(statusEl, "Todavía no hay partidas finalizadas.");
      return;
    }

    setText(statusEl, "");

    let i = 0;
    for (const docSnap of snap.docs) {
      i++;
      const d = docSnap.data();
      const div = document.createElement("div");
      div.className = "panel";
      div.innerHTML = `
        <div class="row" style="align-items:center;">
          <div style="flex:0 0 auto;" class="badge">#${i}</div>
          <div style="flex:1;">
            <div style="font-weight:700;">${(d.nickname || docSnap.id)}</div>
            <div class="small">Elo: <span class="mono">${d.elo ?? "-"}</span> — W/L: <span class="mono">${d.wins ?? 0}/${d.losses ?? 0}</span></div>
          </div>
        </div>
      `;
      rowsEl.appendChild(div);
    }
  } catch (e) {
    statusEl.style.color = "var(--danger)";
    setText(statusEl, e?.message || String(e));
  }
}

onAuth(async (user) => {
  try {
    if (!user) {
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
