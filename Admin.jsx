import React, { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, where, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";

const TRACK_NAMES = {
  programming: "البرمجة",
  design: "التصميم",
  marketing: "التسويق",
  data: "تحليل البيانات",
  ai: "الذكاء الاصطناعي",
  cyber: "الأمن السيبراني",
  languages: "اللغات",
};

function formatTime(ts) {
  return ts?.toDate ? ts.toDate().toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" }) : "";
}

// صفحة المراجعة: للمالكة بس (role = owner في admins)
export default function AdminPage({ user }) {
  const [role, setRole] = useState(null);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user) {
      setRole("");
      return;
    }
    return onSnapshot(doc(db, "admins", user.uid), (snap) => setRole(snap.exists() ? snap.data().role || "" : ""), () => setRole(""));
  }, [user]);

  const isOwner = role === "owner";

  useEffect(() => {
    if (!isOwner) return;
    return onSnapshot(
      query(collection(db, "submissions"), where("status", "==", "pending")),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setItems(list);
      },
      () => setErr("تعذّر تحميل المشاريع. تأكدي إن القواعد اتنشرت.")
    );
  }, [isOwner]);

  async function decide(item, status) {
    setBusy(item.id);
    setErr("");
    try {
      await updateDoc(doc(db, "submissions", item.id), { status, reviewedAt: serverTimestamp() });
    } catch (e) {
      setErr("حصلت مشكلة في الحفظ. حاولي مرة أخرى.");
    }
    setBusy("");
  }

  if (!user) return <p className="forum-meta">سجّلي دخولك بحساب المالكة عشان تشوفي الصفحة دي.</p>;
  if (role === null) return <p className="forum-meta">جاري التحقق...</p>;
  if (!isOwner) return <p className="forum-error">الصفحة دي للمالكة بس.</p>;

  return (
    <div className="admin-page">
      <h2>مراجعة المشاريع</h2>
      <p className="forum-meta">المشاريع المعلقة: {items.length}</p>
      {err && <p className="forum-error">{err}</p>}
      {items.length === 0 && <p className="tree-empty">مفيش مشاريع منتظرة المراجعة دلوقتي.</p>}

      {items.map((it) => (
        <div key={it.id} className="admin-item">
          <div className="admin-meta">
            <strong>{it.name || "طالب"}</strong>
            <span>{TRACK_NAMES[it.track] || it.track} · {it.level}</span>
            <span className="forum-meta">{formatTime(it.createdAt)}</span>
          </div>
          <a href={it.link} target="_blank" rel="noreferrer" className="admin-link">افتحي المشروع ↗</a>
          {it.note && <p className="forum-meta">ملاحظة: {it.note}</p>}
          <div className="admin-actions">
            <button type="button" className="quiz-btn" disabled={busy === it.id} onClick={() => decide(it, "approved")}>قبول</button>
            <button type="button" className="forum-link-btn" disabled={busy === it.id} onClick={() => decide(it, "rejected")}>رفض</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// كارت المالكة في الصفحة الرئيسية: بيظهر لأنتي بس، وبيفتح قايمة المراجعة جواه
export function OwnerCard({ user }) {
  const [role, setRole] = useState("");
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setRole("");
      return;
    }
    return onSnapshot(doc(db, "admins", user.uid), (snap) => setRole(snap.exists() ? snap.data().role || "" : ""), () => setRole(""));
  }, [user]);

  useEffect(() => {
    if (role !== "owner") return;
    return onSnapshot(
      query(collection(db, "submissions"), where("status", "==", "pending")),
      (snap) => setCount(snap.size),
      () => setCount(0)
    );
  }, [role]);

  if (role !== "owner") return null;

  return (
    <div className="owner-card">
      <div className="owner-card-head">
        <strong>🛠️ مراجعة المشاريع</strong>
        <span className="owner-count">{count} منتظر</span>
      </div>
      <button type="button" className="quiz-btn" onClick={() => setOpen(!open)}>
        {open ? "إخفاء القايمة" : "افتحي المراجعة"}
      </button>
      {open && (
        <div className="owner-card-body">
          <AdminPage user={user} />
        </div>
      )}
    </div>
  );
}
