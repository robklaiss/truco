import { auth, db } from "./firebase.js";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

function getApiBase() {
  try {
    const w = typeof window !== "undefined" ? window : null;
    if (!w) return "";
    const fromWindow = w.API_BASE;
    if (typeof fromWindow === "string" && fromWindow.trim() !== "") {
      return fromWindow.replace(/\/+$/, "");
    }
    const fromStorage = w.localStorage ? w.localStorage.getItem("API_BASE") : "";
    if (typeof fromStorage === "string" && fromStorage.trim() !== "") {
      return fromStorage.replace(/\/+$/, "");
    }
    const h = w.location?.hostname;
    if (h === "localhost" || h === "127.0.0.1") {
      return "http://127.0.0.1:8081";
    }
    return "";
  } catch {
    return "";
  }
}

export async function ensureUserDoc(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      nickname: "",
      photoURL: user.photoURL || "",
      createdAt: serverTimestamp(),
      stats: { wins: 0, losses: 0, elo: 1000 }
    });
  } else {
    await updateDoc(ref, {
      photoURL: user.photoURL || ""
    });
  }
  return ref;
}

export async function getUserDoc(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return { ref, snap, data: snap.exists() ? snap.data() : null };
}

export async function setNickname(uid, nickname) {
  const apiBase = getApiBase();
  if (apiBase) {
    const u = auth.currentUser;
    if (!u) {
      throw new Error("auth/missing-user");
    }
    const token = await u.getIdToken();
    let res;
    try {
      res = await fetch(`${apiBase}/api/profile/nickname`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ nickname })
      });
    } catch (e) {
      if (e instanceof TypeError) {
        res = null;
      } else {
        throw e;
      }
    }

    if (!res) {
      const ref = doc(db, "users", uid);
      await setDoc(ref, { nickname }, { merge: true });
      return;
    }

    if (!res.ok) {
      let body = null;
      try {
        body = await res.json();
      } catch {
      }
      const err = body?.error || `http_${res.status}`;
      throw new Error(err);
    }
    return;
  }

  const ref = doc(db, "users", uid);
  await setDoc(ref, { nickname }, { merge: true });
}
