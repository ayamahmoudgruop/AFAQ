import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "./firebase.js";

const CHEERS = ["أنا شايف تقدمك، كمّل كده 👏", "كل خطوة بتقرّبك من القمة 🏔️", "زميلك مستنيك على القمة 🎯"];
const DAY = 24 * 60 * 60 * 1000;

// عدد الكورسات المكتملة (من غير المفاتيح الداخلية)
function countDone(list = []) {
  return list.filter((t) => !t.startsWith("started::") && !t.startsWith("stage::")).length;
}

// بيانات الارتباطات + بيانات الزملاء
function usePairsData(user) {
  const [map, setMap] = useState({});
  const [partners, setPartners] = useState({});
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;
    const apply = (snap) =>
      setMap((prev) => {
        const next = { ...prev };
        snap.docChanges().forEach((c) => {
          if (c.type === "removed") delete next[c.doc.id];
          else next[c.doc.id] = { id: c.doc.id, ...c.doc.data() };
        });
        return next;
      });
    const u1 = onSnapshot(query(collection(db, "pairs"), where("from", "==", uid)), apply);
    const u2 = onSnapshot(query(collection(db, "pairs"), where("to", "==", uid)), apply);
    return () => {
      u1();
      u2();
    };
  }, [uid]);

  const pairList = Object.values(map);
  const otherIds = [...new Set(pairList.map((p) => (p.from === uid ? p.to : p.from)))].join(",");

  useEffect(() => {
    if (!uid || !otherIds) return;
    const unsubs = otherIds.split(",").map((oid) =>
      onSnapshot(doc(db, "users", oid), (snap) => setPartners((prev) => ({ ...prev, [oid]: snap.data() || {} })), () => {})
    );
    return () => unsubs.forEach((u) => u());
  }, [otherIds, uid]);

  return { pairList, partners };
}

// زرار "أرسل طلب زميل" في بروفايل الطالب
export function PairRequestButton({ targetUid }) {
  const me = auth.currentUser?.uid;
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState("");
  if (!me || me === targetUid) return null;

  async function send() {
    try {
      await setDoc(doc(db, "pairs", me + "_" + targetUid), {
        from: me,
        to: targetUid,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setSent(true);
    } catch (e) {
      setMsg("تعذّر إرسال الطلب، حاول مرة أخرى.");
    }
  }

  return (
    <div className="pair-request">
      {sent ? (
        <p className="forum-meta">تم إرسال طلب الزميل ✓</p>
      ) : (
        <button type="button" className="quiz-btn" onClick={send}>أرسل طلب زميل</button>
      )}
      {msg && <p className="forum-error">{msg}</p>}
    </div>
  );
}

// قسم "زميل الرحلة" داخل ☰
export function PairsPanel({ user }) {
  const { pairList, partners } = usePairsData(user);
  const me = user?.uid;

  async function accept(p) {
    await updateDoc(doc(db, "pairs", p.id), { status: "active" });
  }
  async function remove(p) {
    await deleteDoc(doc(db, "pairs", p.id));
  }
  async function cheer(p, text) {
    await updateDoc(doc(db, "pairs", p.id), { cheer: { text, from: me, at: serverTimestamp() } });
  }

  if (pairList.length === 0) {
    return (
      <div className="pair-box">
        <p>ماعندكش زميل حالياً. ادخل بروفايل أي طالب من المنتدى وأرسل له طلب زميل.</p>
      </div>
    );
  }

  return (
    <div className="pair-box">
      {pairList.filter((p) => p.status === "pending" && p.to === me).map((p) => (
        <div key={p.id} className="pair-item">
          <p>طلب زميل من {partners[p.from]?.name || "طالب"}</p>
          <div className="pair-actions">
            <button type="button" className="quiz-btn" onClick={() => accept(p)}>قبول</button>
            <button type="button" className="forum-link-btn" onClick={() => remove(p)}>رفض</button>
          </div>
        </div>
      ))}

      {pairList.filter((p) => p.status === "pending" && p.from === me).map((p) => (
        <div key={p.id} className="pair-item">
          <p>طلبك لـ {partners[p.to]?.name || "طالب"} مستني الرد</p>
          <button type="button" className="forum-link-btn" onClick={() => remove(p)}>إلغاء الطلب</button>
        </div>
      ))}

      {pairList.filter((p) => p.status === "active").map((p) => {
        const oid = p.from === me ? p.to : p.from;
        const pt = partners[oid] || {};
        return (
          <div key={p.id} className="pair-item">
            <p><strong>زميلك: {pt.name || "طالب"}</strong></p>
            <p className="forum-meta">خلص {countDone(pt.done)} كورس حتى الآن</p>
            {p.cheer && p.cheer.from !== me && <p className="forum-meta">آخر تشجيع: {p.cheer.text}</p>}
            <div className="pair-cheers">
              {CHEERS.map((t) => (
                <button key={t} type="button" className="pair-cheer" onClick={() => cheer(p, t)}>{t}</button>
              ))}
            </div>
            <button type="button" className="forum-link-btn" onClick={() => remove(p)}>فك الارتباط</button>
          </div>
        );
      })}
    </div>
  );
}

// يشتغل دايماً: يسجّل آخر ظهور، ويظهر تنبيه لو زميلك غاب يومين
export function PairsWatcher({ user }) {
  const { pairList, partners } = usePairsData(user);
  const me = user?.uid;

  useEffect(() => {
    if (!me) return;
    setDoc(doc(db, "users", me), { lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
  }, [me]);

  if (!me) return null;

  const stale = pairList
    .filter((p) => p.status === "active")
    .find((p) => {
      const oid = p.from === me ? p.to : p.from;
      const seen = partners[oid]?.lastSeen?.toMillis?.();
      return seen && Date.now() - seen > 2 * DAY;
    });
  if (!stale) return null;

  const oid = stale.from === me ? stale.to : stale.from;
  const name = partners[oid]?.name || "زميلك";
  const key = "afaq-pair-notice-" + stale.id + "-" + new Date().toDateString();
  if (localStorage.getItem(key)) return null;

  function dismissWith(text) {
    try {
      localStorage.setItem(key, "1");
    } catch (e) {}
    updateDoc(doc(db, "pairs", stale.id), { cheer: { text, from: me, at: serverTimestamp() } }).catch(() => {});
  }

  return (
    <div className="pair-notice">
      <p>{name} مستنيك على القمة 🏔️</p>
      <div className="pair-cheers">
        {CHEERS.map((t) => (
          <button key={t} type="button" className="pair-cheer" onClick={() => dismissWith(t)}>{t}</button>
        ))}
      </div>
    </div>
  );
}
