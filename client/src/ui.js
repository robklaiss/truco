import { logout, waitForUser } from "./firebase.js";

export function qs(sel) {
  const el = document.querySelector(sel);
  if (!el) {
    throw new Error(`Missing element: ${sel}`);
  }
  return el;
}

export function setText(el, txt) {
  el.textContent = txt == null ? "" : String(txt);
}

export function setUserChip({ photoEl, nameEl, logoutEl }, user, nickname) {
  if (photoEl) {
    photoEl.src = user.photoURL || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Crect width='28' height='28' fill='%23121a33'/%3E%3C/svg%3E";
  }
  if (nameEl) {
    nameEl.textContent = nickname || user.displayName || user.email || "";
  }
  if (logoutEl) {
    logoutEl.addEventListener("click", async (e) => {
      e.preventDefault();
      await logout();
      window.location.href = "/login.html";
    });
  }
}

export async function requireAuthOrRedirect() {
  const user = await waitForUser();
  if (!user) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login.html?next=${next}`;
    return null;
  }
  return user;
}
