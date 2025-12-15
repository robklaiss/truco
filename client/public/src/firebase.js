import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { browserLocalPersistence, browserSessionPersistence, getAuth, getRedirectResult, GoogleAuthProvider, inMemoryPersistence, onAuthStateChanged, setPersistence, signInWithPopup, signInWithRedirect, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { getFirestore, initializeFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

function getConfig() {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey || cfg.apiKey === "CHANGE_ME") {
    throw new Error("Missing Firebase config. Fill /firebase-config.js");
  }
  return cfg;
}

export const app = initializeApp(getConfig());
export const auth = getAuth(app);
let _db;
try {
  _db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true, experimentalForceLongPolling: true });
} catch {
  _db = getFirestore(app);
}
export const db = _db;
export const googleProvider = new GoogleAuthProvider();

export let authPersistence = { mode: "unknown", error: "" };

async function initPersistence() {
  try {
    await setPersistence(auth, browserLocalPersistence);
    authPersistence = { mode: "local", error: "" };
    return authPersistence;
  } catch (e1) {
    try {
      await setPersistence(auth, browserSessionPersistence);
      authPersistence = { mode: "session", error: String(e1?.code || e1?.message || e1) };
      return authPersistence;
    } catch (e2) {
      await setPersistence(auth, inMemoryPersistence);
      authPersistence = { mode: "memory", error: String(e2?.code || e2?.message || e2) };
      return authPersistence;
    }
  }
}

const _persistenceReady = initPersistence().catch(() => ({ mode: "unknown", error: "" }));

export let analytics = null;
(async () => {
  try {
    const cfg = getConfig();
    if (!cfg.measurementId) return;
    const supported = await isSupported();
    if (!supported) return;
    analytics = getAnalytics(app);
  } catch {
    analytics = null;
  }
})();

export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export async function loginWithGoogle() {
  const p = await _persistenceReady;
  if (p?.mode === "memory") {
    throw new Error("Firebase Auth persistence blocked by browser settings. Enable cookies/storage for localhost or disable tracking protection, then retry.");
  }

  try {
    const res = await signInWithPopup(auth, googleProvider);
    return { mode: "popup", user: res?.user || null };
  } catch (e) {
    const code = e?.code ? String(e.code) : "";
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, googleProvider);
      return { mode: "redirect", user: null };
    }
    throw e;
  }
}

export async function getGoogleRedirectResult() {
  await _persistenceReady;
  return getRedirectResult(auth);
}

export async function logout() {
  return signOut(auth);
}

export function waitForUser(timeoutMs = 8000) {
  return new Promise((resolve) => {
    _persistenceReady
      .catch(() => null)
      .then(() => {
      let done = false;
      const unsub = onAuthStateChanged(auth, (u) => {
        if (u) {
          done = true;
          unsub();
          resolve(u);
        }
      });
      setTimeout(() => {
        if (done) return;
        unsub();
        resolve(null);
      }, timeoutMs);
      });
  });
}
