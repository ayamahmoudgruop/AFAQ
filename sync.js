import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";

// بيانات المستخدم المسجل: نتيجة الكويز والكورسات المكتملة
export async function loadUserData(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveUserData(uid, data) {
  await setDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}
