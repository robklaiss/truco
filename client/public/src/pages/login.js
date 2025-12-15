import { authPersistence, getGoogleRedirectResult, loginWithGoogle, onAuth } from "../firebase.js";
import { ensureUserDoc, getUserDoc } from "../user_store.js";
import { qs, setText } from "../ui.js";

const btn = qs("#btnLogin");
const errorEl = qs("#error");
const REDIRECT_KEY = "auth_redirect_in_flight";

function formatAuthError(e) {
  const code = e?.code ? String(e.code) : "";
  const msg = e?.message ? String(e.message) : String(e);
  if (code === "auth/configuration-not-found") {
    return `${code}\n${msg}\n\nFix: Firebase Console -> Authentication -> Sign-in method -> enable Google.`;
  }
  if (code === "auth/operation-not-allowed") {
    return `${code}\n${msg}\n\nFix: Firebase Console -> Authentication -> Sign-in method -> enable the provider you're using (Google).`;
  }
  if (code === "auth/unauthorized-domain") {
    return `${code}\n${msg}\n\nFix: Firebase Console -> Authentication -> Settings -> Authorized domains -> add the hostname you're using (e.g. 127.0.0.1 and/or localhost).`;
  }
  if (code === "permission-denied" || code === "firestore/permission-denied" || msg.includes("Missing or insufficient permissions")) {
    const shownCode = code || "permission-denied";
    return `${shownCode}\n${msg}\n\nFix: Firebase Console -> Firestore Database -> Rules -> Publish:\n\nrules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /users/{userId} {\n      allow read, write: if request.auth != null && request.auth.uid == userId;\n    }\n  }\n}`;
  }
  return code ? `${code}\n${msg}` : msg;
}

async function goNext(uid) {
  const { data } = await getUserDoc(uid);
  const nextParam = new URLSearchParams(window.location.search).get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : null;
  if (!data || !data.nickname) {
    window.location.href = "/profile.html";
    return;
  }
  window.location.href = next || "/index.html";
}

btn.addEventListener("click", async () => {
  setText(errorEl, "");
  btn.disabled = true;
  try {
    sessionStorage.setItem(REDIRECT_KEY, "1");
    const res = await loginWithGoogle();
    if (res?.mode === "popup") {
      sessionStorage.removeItem(REDIRECT_KEY);
      const user = res?.user;
      if (user) {
        setText(errorEl, "Cargando perfil...");
        await ensureUserDoc(user);
        await goNext(user.uid);
        return;
      }
      throw new Error("Login cancelado.");
    }
  } catch (e) {
    sessionStorage.removeItem(REDIRECT_KEY);
    setText(errorEl, formatAuthError(e));
    btn.disabled = false;
  } finally {
  }
});

function waitForSignedInUser(timeoutMs = 8000) {
  return new Promise((resolve) => {
    const unsub = onAuth((u) => {
      if (u) {
        unsub();
        resolve(u);
      }
    });
    setTimeout(() => {
      unsub();
      resolve(null);
    }, timeoutMs);
  });
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs))
  ]);
}

(async () => {
  let timer = null;
  try {
    const redirectInFlight = sessionStorage.getItem(REDIRECT_KEY) === "1";
    if (!redirectInFlight) {
      const u = await withTimeout(waitForSignedInUser(800), 900);
      if (u) {
        setText(errorEl, "Cargando perfil...");
        await ensureUserDoc(u);
        await goNext(u.uid);
        return;
      }
      setText(errorEl, "");
      btn.disabled = false;
      return;
    }

    const startedAt = Date.now();
    timer = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      setText(errorEl, `Esperando inicio de sesión... (${s}s) [${authPersistence?.mode || "unknown"}]`);
    }, 250);

    const authUserPromise = waitForSignedInUser();
    const redirect = await withTimeout(
      getGoogleRedirectResult().catch((e) => ({ __redirectError: e })),
      12000
    );
    if (redirect && redirect.__redirectError) {
      throw redirect.__redirectError;
    }
    const res = redirect;
    const u = await withTimeout(authUserPromise, 12000);

    const user = res?.user || u;
    if (user) {
      sessionStorage.removeItem(REDIRECT_KEY);
      if (timer) clearInterval(timer);
      setText(errorEl, "Cargando perfil...");

      const ensured = await withTimeout(
        (async () => {
          await ensureUserDoc(user);
          return true;
        })(),
        8000
      );
      if (!ensured) {
        throw new Error("Timeout escribiendo/leyendo Firestore (users/{uid}). Verificá que Firestore esté creado en Firebase Console y que las Rules permitan read/write para usuarios autenticados.");
      }

      const navigated = await withTimeout(
        (async () => {
          await goNext(user.uid);
          return true;
        })(),
        8000
      );
      if (!navigated) {
        throw new Error("Timeout leyendo perfil desde Firestore. Verificá Firestore + Rules + conexión.");
      }
      return;
    }

    if (timer) clearInterval(timer);
    sessionStorage.removeItem(REDIRECT_KEY);
    setText(errorEl, `No se detectó sesión después del login. Persistencia: ${authPersistence?.mode || "unknown"}. Revisá: Google provider habilitado en Firebase Auth, dominios autorizados (localhost), y si tu navegador bloquea cookies/trackers (probá sin incógnito o desactivá bloqueo estricto). Abrí DevTools Console y pegá cualquier error FirebaseError.`);
    btn.disabled = false;
  } catch (e) {
    if (timer) clearInterval(timer);
    sessionStorage.removeItem(REDIRECT_KEY);
    setText(errorEl, formatAuthError(e));
    btn.disabled = false;
  }
})();
