import { ensureUserDoc, getUserDoc, setNickname } from "../user_store.js";
import { qs, requireAuthOrRedirect, setText, setUserChip } from "../ui.js";

const photoEl = qs("#userPhoto");
const nameEl = qs("#userName");
const logoutEl = qs("#btnLogout");

const uidEl = qs("#uid");
const nickInput = qs("#nickname");
const btnSave = qs("#btnSave");
const statusEl = qs("#status");

function validateNickname(nick) {
  const trimmed = nick.trim();
  if (trimmed.length < 3 || trimmed.length > 20) {
    return "El apodo debe tener entre 3 y 20 caracteres.";
  }
  if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
    return "Usá solo letras, números, guión (-) o guión bajo (_).";
  }
  return null;
}

function goNext() {
  const nextParam = new URLSearchParams(window.location.search).get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : null;
  window.location.href = next || "/index.html";
}

(async () => {
  const user = await requireAuthOrRedirect();
  if (!user) return;

  await ensureUserDoc(user);
  setText(uidEl, user.uid);

  const { data } = await getUserDoc(user.uid);
  const nickname = data?.nickname || "";
  nickInput.value = nickname;

  setUserChip({ photoEl, nameEl, logoutEl }, user, nickname);

  btnSave.addEventListener("click", async () => {
    setText(statusEl, "");
    const err = validateNickname(nickInput.value);
    if (err) {
      statusEl.style.color = "var(--danger)";
      setText(statusEl, err);
      return;
    }

    btnSave.disabled = true;
    try {
      const value = nickInput.value.trim();
      await setNickname(user.uid, value);
      statusEl.style.color = "var(--ok)";
      setText(statusEl, "Guardado.");
      setUserChip({ photoEl, nameEl, logoutEl }, user, value);
      setTimeout(goNext, 200);
    } catch (e) {
      statusEl.style.color = "var(--danger)";
      setText(statusEl, e?.message || String(e));
    } finally {
      btnSave.disabled = false;
    }
  });
})();
