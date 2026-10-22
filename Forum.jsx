import React, { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { db, auth, googleProvider } from "./firebase.js";

const MAX = { title: 120, body: 1500, code: 3000 };
const COOLDOWN_MS = 30000;
const CATEGORIES = ["برمجة", "تصميم", "ماركتنج", "بيانات", "لغات", "عام"];
const REPORTED_KEY = "afaq-reported";

function cooldownLeft() {
  try {
    const last = Number(localStorage.getItem("afaq-last-post") || 0);
    return Math.max(0, COOLDOWN_MS - (Date.now() - last));
  } catch (e) {
    return 0;
  }
}

function markPosted() {
  try {
    localStorage.setItem("afaq-last-post", String(Date.now()));
  } catch (e) {}
}

function getReported() {
  try {
    return JSON.parse(localStorage.getItem(REPORTED_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function markReported(key) {
  try {
    localStorage.setItem(REPORTED_KEY, JSON.stringify([...getReported(), key]));
  } catch (e) {}
}

function formatTime(ts) {
  if (!ts || !ts.toDate) return "";
  return ts.toDate().toLocaleString("ar-EG");
}

// حالة المستخدم المسجل
function useUser() {
  const [user, setUser] = useState(null);
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);
  return user;
}

function AuthBar({ user }) {
  const [err, setErr] = useState("");

  async function login() {
    setErr("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setErr("تعذّر تسجيل الدخول، جرّب تاني.");
    }
  }

  if (!user) {
    return (
      <div className="forum-auth">
        <button type="button" className="quiz-btn" onClick={login}>سجّل دخول بجوجل</button>
        <p className="forum-meta">التسجيل مطلوب عشان تنشر أو ترد أو تبلغ.</p>
        {err && <p className="forum-error">{err}</p>}
      </div>
    );
  }

  return (
    <div className="forum-auth">
      <span>أنت داخل باسم <strong>{user.displayName || "مستخدم"}</strong></span>
      <button type="button" className="forum-report" onClick={() => signOut(auth)}>تسجيل الخروج</button>
    </div>
  );
}

// زرار الإبلاغ: لازم تكون مسجل، والبلاغ بيتحفظ في reports
function ReportButton({ user, questionId, replyId = "" }) {
  const key = questionId + ":" + replyId;
  const [done, setDone] = useState(getReported().includes(key));
  const [busy, setBusy] = useState(false);

  async function report() {
    if (!user || done || busy) return;
    setBusy(true);
    try {
      await addDoc(collection(db, "reports"), {
        questionId,
        replyId,
        uid: user.uid,
        createdAt: serverTimestamp(),
      });
      markReported(key);
      setDone(true);
    } catch (err) {
      // لو فشل، الزرار يفضل متاح
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="forum-report" onClick={report} disabled={!user || done || busy}>
      {done ? "تم الإبلاغ ✓" : "🚩 إبلاغ"}
    </button>
  );
}

export default function Forum() {
  const user = useUser();
  const [questions, setQuestions] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [view, setView] = useState("list");
  const [active, setActive] = useState(null);
  const [filter, setFilter] = useState("الكل");

  useEffect(() => {
    const q = query(collection(db, "questions"), orderBy("createdAt", "desc"), limit(50));
    return onSnapshot(
      q,
      (snap) => setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setLoadError(true)
    );
  }, []);

  if (view === "new") {
    return <NewQuestion user={user} onDone={() => setView("list")} onCancel={() => setView("list")} />;
  }

  if (view === "question" && active) {
    return <QuestionView user={user} question={active} onBack={() => setView("list")} />;
  }

  const shown = filter === "الكل" ? questions : questions.filter((q) => (q.category || "عام") === filter);

  return (
    <div className="forum-list">
      <AuthBar user={user} />

      <button
        type="button"
        className="quiz-btn"
        disabled={!user}
        onClick={() => setView("new")}
      >
        اكتب سؤال جديد
      </button>

      <div className="forum-chips">
        {["الكل", ...CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            className={"forum-chip" + (filter === c ? " active" : "")}
            onClick={() => setFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {loadError && <p className="forum-error">تعذّر تحميل الأسئلة، جرّب تحدّث الصفحة.</p>}
      {!loadError && shown.length === 0 && <p className="tree-empty">لسه مفيش أسئلة هنا، كن أول واحد يسأل.</p>}

      {shown.map((q) => (
        <button
          key={q.id}
          type="button"
          className="forum-item"
          onClick={() => {
            setActive(q);
            setView("question");
          }}
        >
          <span className="forum-tag">{q.category || "عام"}</span>
          <strong>{q.title}</strong>
          <span>{q.name} · {formatTime(q.createdAt)}</span>
        </button>
      ))}
    </div>
  );
}

function NewQuestion({ user, onDone, onCancel }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("عام");
  const [body, setBody] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const valid =
    user && title.trim() && body.trim() &&
    title.length <= MAX.title && body.length <= MAX.body && code.length <= MAX.code;

  async function send(e) {
    e.preventDefault();
    if (!valid || busy) return;
    if (cooldownLeft() > 0) {
      setMsg("استنى شوية قبل ما تنشر تاني.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await addDoc(collection(db, "questions"), {
        uid: user.uid,
        name: (user.displayName || "مستخدم").slice(0, 40),
        title: title.trim(),
        category,
        body: body.trim(),
        code: code,
        createdAt: serverTimestamp(),
      });
      markPosted();
      onDone();
    } catch (err) {
      setMsg("حصلت مشكلة في النشر، جرّب تاني.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="forum-form" onSubmit={send}>
      <button type="button" className="page-back" onClick={onCancel}>رجوع للأسئلة</button>
      <input className="forum-input" placeholder="مثال: ليه الصورة مش بتظهر على الموبايل؟" value={title} maxLength={MAX.title} onChange={(e) => setTitle(e.target.value)} />
      <p className="forum-meta">اكتب المشكلة أو الهدف في جملة قصيرة، والتفاصيل تكتبيها في خانة الشرح.</p>
      <select className="forum-input" value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <textarea className="forum-input" placeholder="اشرح سؤالك" value={body} maxLength={MAX.body} onChange={(e) => setBody(e.target.value)} />
      <textarea className="forum-input forum-code" placeholder="الكود (اختياري)" value={code} maxLength={MAX.code} onChange={(e) => setCode(e.target.value)} spellCheck={false} />
      {msg && <p className="forum-error">{msg}</p>}
      <button type="submit" className="quiz-btn" disabled={!valid || busy}>
        {busy ? "جاري النشر..." : "انشر السؤال"}
      </button>
    </form>
  );
}

function QuestionView({ user, question, onBack }) {
  const [replies, setReplies] = useState([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const q = query(collection(db, "questions", question.id, "replies"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => setReplies(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [question.id]);

  async function reply(e) {
    e.preventDefault();
    if (!user || !body.trim() || body.length > MAX.body || busy) return;
    if (cooldownLeft() > 0) {
      setMsg("استنى شوية قبل ما ترد تاني.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await addDoc(collection(db, "questions", question.id, "replies"), {
        uid: user.uid,
        name: (user.displayName || "مستخدم").slice(0, 40),
        body: body.trim(),
        createdAt: serverTimestamp(),
      });
      markPosted();
      setBody("");
    } catch (err) {
      setMsg("حصلت مشكلة في الرد، جرّب تاني.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="forum-question">
      <button type="button" className="page-back" onClick={onBack}>رجوع للأسئلة</button>
      <span className="forum-tag">{question.category || "عام"}</span>
      <h3>{question.title}</h3>
      <p className="forum-meta">
        {question.uid ? <a href={"#/u/" + question.uid}>{question.name}</a> : question.name} · {formatTime(question.createdAt)}
      </p>
      <p>{question.body}</p>
      {question.code && <pre className="forum-pre">{question.code}</pre>}
      <div className="forum-actions">
        <ReportButton user={user} questionId={question.id} />
      </div>

      <h4>الردود ({replies.length})</h4>
      {replies.map((r) => (
        <div key={r.id} className="forum-reply">
          <p className="forum-meta">
            {r.uid ? <a href={"#/u/" + r.uid}>{r.name}</a> : r.name} · {formatTime(r.createdAt)}
          </p>
          <p>{r.body}</p>
          <div className="forum-actions">
            <ReportButton user={user} questionId={question.id} replyId={r.id} />
          </div>
        </div>
      ))}

      {user ? (
        <form className="forum-form" onSubmit={reply}>
          <textarea className="forum-input" placeholder="اكتب ردك" value={body} maxLength={MAX.body} onChange={(e) => setBody(e.target.value)} />
          {msg && <p className="forum-error">{msg}</p>}
          <button type="submit" className="quiz-btn" disabled={busy || !body.trim()}>{busy ? "جاري الإرسال..." : "أرسل الرد"}</button>
        </form>
      ) : (
        <p className="forum-meta">سجّل دخول عشان تكتب ردك.</p>
      )}
    </div>
  );
}

// صفحة بروفايل: الأسئلة اللي الشخص نشرها
export function UserProfile({ uid }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "questions"), where("uid", "==", uid), limit(100));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setItems(list);
    });
  }, [uid]);

  const name = items[0]?.name || "مستخدم";

  return (
    <div className="forum-list">
      <h2>{name}</h2>
      <p className="forum-meta">عدد الأسئلة: {items.length}</p>
      {items.length === 0 && <p className="tree-empty">لسه ما نشرش أسئلة.</p>}
      {items.map((q) => (
        <div key={q.id} className="forum-item">
          <span className="forum-tag">{q.category || "عام"}</span>
          <strong>{q.title}</strong>
          <span>{formatTime(q.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}
