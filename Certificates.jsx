import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase.js";

export const CERT_TRACK_LABELS = {
  programming: "البرمجة",
  design: "التصميم",
  marketing: "التسويق",
  data: "تحليل البيانات",
  ai: "الذكاء الاصطناعي",
  cyber: "الأمن السيبراني",
  languages: "اللغات",
};

// كود تحقق عشوائي من غير حروف ملتبسة
export function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// زرار طلب الشهادة: يظهر لما المسار كله يتخلص
export function CertRequestCard({ user, track, ready }) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const id = user ? user.uid + "_" + track : "";

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((s) => setName(s.exists() ? s.data().name || "" : ""));
    return onSnapshot(doc(db, "certRequests", id), (snap) => setStatus(snap.exists() ? snap.data().status : ""), () => {});
  }, [id, user]);

  if (!user || !ready) return null;

  async function request() {
    setBusy(true);
    try {
      await setDoc(doc(db, "certRequests", id), {
        uid: user.uid,
        name,
        track,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setMsg("تم إرسال طلب الشهادة، هتوصلك بعد المراجعة.");
    } catch (e) {
      setMsg("تعذّر إرسال الطلب، حاول مرة أخرى.");
    }
    setBusy(false);
  }

  return (
    <div className="cert-card">
      <strong>🎓 خلّصتي مسار {CERT_TRACK_LABELS[track] || track}</strong>
      {status === "issued" ? (
        <p className="forum-meta">الشهادة اتصدرت، تقدري تلاقيها في بروفايلك.</p>
      ) : status === "pending" ? (
        <p className="forum-meta">طلب الشهادة قيد المراجعة.</p>
      ) : (
        <button type="button" className="quiz-btn" disabled={busy || !name} onClick={request}>
          {busy ? "جاري الإرسال..." : "اطلب الشهادة"}
        </button>
      )}
      {!name && <p className="forum-meta">لازم تكتبي اسمك الحقيقي الأول في المنتدى.</p>}
      {msg && <p className="forum-meta">{msg}</p>}
    </div>
  );
}

// صفحة التحقق العامة: أي حد يقدر يتأكد من الشهادة بالكود
export function VerifyPage({ code }) {
  const [data, setData] = useState(undefined);
  useEffect(() => {
    const clean = String(code || "").trim().toUpperCase();
    if (!clean) {
      setData(null);
      return;
    }
    getDoc(doc(db, "certificates", clean))
      .then((s) => setData(s.exists() ? s.data() : null))
      .catch(() => setData(null));
  }, [code]);

  if (data === undefined) return <p className="forum-meta">جاري التحقق...</p>;
  if (data === null) return <p className="forum-error">الشهادة دي مش موجودة. اتأكدي من الكود.</p>;
  const date = data.issuedAt?.toDate ? data.issuedAt.toDate().toLocaleDateString("ar-EG") : "";
  return (
    <div className="cert-verify">
      <h2>✓ شهادة صحيحة</h2>
      <p><strong>{data.name}</strong></p>
      <p>أتم مسار {CERT_TRACK_LABELS[data.track] || data.track} في منصة آفاق</p>
      <p className="forum-meta">تاريخ الإصدار: {date}</p>
      <p className="forum-meta">كود التحقق: {data.code}</p>
    </div>
  );
}

// إصدار الشهادة (للمالكة من صفحة المراجعة)
export async function issueCertificate(req) {
  const code = makeCode();
  await setDoc(doc(db, "certificates", code), {
    code,
    uid: req.uid,
    name: req.name || "",
    track: req.track,
    issuedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "certRequests", req.uid + "_" + req.track), { status: "issued", code });
  return code;
}
