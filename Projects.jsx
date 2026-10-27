import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  query,
  where,
  runTransaction,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase.js";

// الشهادة/المشروع المعتمد لكل مستوى: مجموعة مستويات المستخدم اتقبل مشروعه
export function useApprovedLevels(user, track) {
  const [approved, setApproved] = useState(new Set());
  const uid = user?.uid;
  useEffect(() => {
    if (!uid) {
      setApproved(new Set());
      return;
    }
    return onSnapshot(
      query(collection(db, "submissions"), where("uid", "==", uid), where("track", "==", track)),
      (snap) => {
        const s = new Set();
        snap.docs.forEach((d) => {
          const x = d.data();
          if (x.status === "approved") s.add(x.level);
        });
        setApproved(s);
      },
      () => setApproved(new Set())
    );
  }, [uid, track]);
  return approved;
}

// عداد المستوى: لما 5 طلاب يسلّموا، يتبعت إيميل لك باسمهم
async function bumpCounter(track, level, name) {
  const ref = doc(db, "counters", track + "_" + level);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists() ? snap.data().count || 0 : 0;
    const next = cur + 1;
    tx.set(ref, { count: next, track, level, members: arrayUnion(name) }, { merge: true });
    return { count: next, members: [...(snap.exists() ? snap.data().members || [] : []), name] };
  });
}

function notifyOwner(trackLabel, level, members) {
  fetch("https://formspree.io/f/xdeaqpdr", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      _subject: "5 طلاب أتموا مستوى " + level + " في " + trackLabel,
      المسار: trackLabel,
      المستوى: level,
      الطلاب: members.join("، "),
    }),
  }).catch(() => {});
}

// نافذة المشروع: الوصف + التسليم
export function ProjectBox({ user, track, trackLabel, level, project, approved, onClose }) {
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const id = user.uid + "_" + track + "_" + level;

  useEffect(() => {
    getDoc(doc(db, "users", user.uid)).then((s) => setName(s.exists() ? s.data().name || "" : ""));
    return onSnapshot(doc(db, "submissions", id), (snap) => {
      if (snap.exists()) {
        setStatus(snap.data().status || "");
        setLink(snap.data().link || "");
        setNote(snap.data().note || "");
      }
    });
  }, [id, user.uid]);

  async function submit(e) {
    e.preventDefault();
    if (!/^https?:\/\//.test(link.trim())) {
      setMsg("الرابط لازم يبدأ بـ https://");
      return;
    }
    setBusy(true);
    try {
      const existing = await getDoc(doc(db, "submissions", id));
      const data = {
        uid: user.uid,
        name,
        track,
        level,
        link: link.trim(),
        note: note.trim().slice(0, 500),
        status: "pending",
      };
      if (!existing.exists()) {
        await setDoc(doc(db, "submissions", id), { ...data, createdAt: serverTimestamp() });
        const r = await bumpCounter(track, level, name);
        if (r.count === 5) notifyOwner(trackLabel, level, r.members);
      } else if (existing.data().status === "pending") {
        await setDoc(doc(db, "submissions", id), { link: data.link, note: data.note }, { merge: true });
      }
      setStatus("pending");
      setMsg("تم التسليم، المشروع قيد المراجعة.");
    } catch (err) {
      setMsg("حصلت مشكلة في التسليم. حاول مرة أخرى.");
    }
    setBusy(false);
  }

  const isApproved = approved.has(level) || status === "approved";

  return (
    <div className="project-box">
      <div className="project-head">
        <strong>🛠️ مشروع {level}</strong>
        <button type="button" className="forum-link-btn" onClick={onClose}>إغلاق</button>
      </div>
      <p>{project.title}</p>
      <p className="forum-meta">{project.desc}</p>
      {isApproved ? (
        <p className="forum-thanks">✓ المشروع اتقبل، والمستوى الجاي اتفتح.</p>
      ) : status === "pending" ? (
        <p className="forum-meta">المشروع قيد المراجعة. ممكن تعدّلي الرابط لحد ما يتراجع.</p>
      ) : null}
      {!isApproved && (
        <form className="forum-form" onSubmit={submit}>
          <input className="forum-input" placeholder="رابط المشروع (GitHub أو Drive)" value={link} onChange={(e) => setLink(e.target.value)} />
          <textarea className="forum-input" placeholder="ملاحظة قصيرة (اختياري)" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
          {msg && <p className="forum-error">{msg}</p>}
          <button type="submit" className="quiz-btn" disabled={busy || !link.trim()}>{busy ? "جاري التسليم..." : "سلّم المشروع"}</button>
        </form>
      )}
    </div>
  );
}
