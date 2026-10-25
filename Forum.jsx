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
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
} from "firebase/firestore";
import { tracks } from "./data.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { db, auth, googleProvider } from "./firebase.js";
import CodeBox from "./CodeBox.jsx";

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
      setErr("تعذّر تسجيل الدخول. حاول مرة أخرى.");
    }
  }

  if (!user) {
    return (
      <div className="forum-auth">
        <button type="button" className="quiz-btn" onClick={login}>سجّل دخول بجوجل</button>
        <p className="forum-meta">قم بتسجيل الدخول لتتمكن من النشر والرد والإبلاغ.</p>
        {err && <p className="forum-error">{err}</p>}
      </div>
    );
  }

  return (
    <div className="forum-auth">
      <span>تم التسجيل باسم <strong>{user.displayName || "مستخدم"}</strong></span>
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

/* زرار "ده ساعدني": كل مستخدم يضغطه مرة واحدة على الرد */
function HelpfulButton({ user, questionId, reply }) {
  const list = reply.helpful || [];
  const mine = !!user && list.includes(user.uid);
  const isOwn = !!user && reply.uid === user.uid;
  const [busy, setBusy] = useState(false);

  async function vote() {
    if (!user || mine || isOwn || busy) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, "questions", questionId, "replies", reply.id), {
        helpful: arrayUnion(user.uid),
      });
    } catch (err) {
      // لو فشل، الزرار يفضل متاح
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="forum-helpful" onClick={vote} disabled={!user || mine || isOwn || busy}>
      👍 ده ساعدني ({list.length})
    </button>
  );
}

/* لوحة المتصدرين: نسبة لكل عضو من 3 مجالات */
const TRACK_TOTAL = Object.values(tracks).reduce((n, list) => n + list.length, 0);

function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    async function build() {
      try {
        const stats = {};
        const get = (uid, name) => {
          if (!uid) return null;
          if (!stats[uid]) stats[uid] = { uid, name: name || "مستخدم", asks: 0, replies: 0, helpful: 0, done: 0 };
          if (name) stats[uid].name = name;
          return stats[uid];
        };

        // الأسئلة والردود
        const qSnap = await getDocs(query(collection(db, "questions"), limit(200)));
        for (const d of qSnap.docs) {
          const q = d.data();
          const s = get(q.uid, q.name);
          if (s) s.asks++;
          const rSnap = await getDocs(collection(db, "questions", d.id, "replies"));
          rSnap.docs.forEach((rd) => {
            const r = rd.data();
            const rs = get(r.uid, r.name);
            if (rs) {
              rs.replies++;
              rs.helpful += (r.helpful || []).length;
            }
          });
        }

        // الكورسات المكتملة (من لوحة الكورسات)
        const lbSnap = await getDocs(collection(db, "leaderboard"));
        lbSnap.docs.forEach((d) => {
          const s = get(d.id, d.data().name);
          if (s) s.done = d.data().score || 0;
        });

        const list = Object.values(stats);
        const maxHelp = Math.max(1, ...list.map((s) => s.helpful));
        const maxAct = Math.max(1, ...list.map((s) => s.asks + s.replies));
        const scored = list
          .map((s) => {
            const pCourses = TRACK_TOTAL ? (s.done / TRACK_TOTAL) * 100 : 0;
            const pHelp = (s.helpful / maxHelp) * 100;
            const pAct = ((s.asks + s.replies) / maxAct) * 100;
            const total = pCourses * 0.4 + pHelp * 0.4 + pAct * 0.2;
            return { ...s, pCourses, pHelp, pAct, total };
          })
          .sort((x, y) => y.total - x.total)
          .slice(0, 20);
        if (alive) setRows(scored);
      } catch (e) {
        if (alive) setErr(true);
      } finally {
        if (alive) setLoading(false);
      }
    }
    build();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <p className="tree-empty">جاري حساب الترتيب...</p>;
  if (err) return <p className="forum-error">تعذّر تحميل المتصدرين. حدّث الصفحة وحاول مرة أخرى.</p>;
  if (rows.length === 0) return <p className="tree-empty">لسه مفيش نشاط. أول أسئلة وردود هتبدأ الترتيب.</p>;

  const me = null;
  return (
    <div className="lb-list">
      {rows.map((r, i) => (
        <div key={r.uid} className="lb-row">
          <span className="lb-rank">{i + 1}</span>
          <div className="lb-info">
            <span className="lb-name">{r.name}</span>
            <span className="lb-detail">
              كورسات {Math.round(r.pCourses)}% · مساعدة {Math.round(r.pHelp)}% · تفاعل {Math.round(r.pAct)}%
            </span>
          </div>
          <span className="lb-score">{Math.round(r.total)}%</span>
        </div>
      ))}
    </div>
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
        {["الكل", ...CATEGORIES, "المتصدرين"].map((c) => (
          <button
            key={c}
            type="button"
            className={"forum-chip" + (filter === c ? " active" : "")}
            onClick={() => setFilter(c)}
          >
            {c === "المتصدرين" ? "🏆 لوحة الشرف" : c}
          </button>
        ))}
      </div>

      {loadError && <p className="forum-error">تعذّر تحميل الأسئلة. حدّث الصفحة وحاول مرة أخرى.</p>}
      {filter === "المتصدرين" && <Leaderboard />}
      {filter !== "المتصدرين" && !loadError && shown.length === 0 && <p className="tree-empty">لا توجد أسئلة في هذا القسم حتى الآن.</p>}

      {filter !== "المتصدرين" && shown.map((q) => (
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
      setMsg("يمكنك النشر مرة أخرى بعد 30 ثانية.");
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
        code: category === "برمجة" ? code : "",
        createdAt: serverTimestamp(),
      });
      markPosted();
      onDone();
    } catch (err) {
      setMsg("حدث خطأ أثناء النشر. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="forum-form" onSubmit={send}>
      <button type="button" className="page-back" onClick={onCancel}>رجوع للأسئلة</button>
      <input className="forum-input" placeholder="مثال: احتاج مساعدة" value={title} maxLength={MAX.title} onChange={(e) => setTitle(e.target.value)} />
      <p className="forum-meta">اكتب المشكلة أو الهدف في جملة قصيرة والتفاصيل في خانة الشرح</p>
      <select className="forum-input" value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <textarea className="forum-input" placeholder="اشرح سؤالك" value={body} maxLength={MAX.body} onChange={(e) => setBody(e.target.value)} />
      {category === "برمجة" && <CodeBox />}
      {category === "برمجة" && (
      <textarea className="forum-input forum-code" placeholder="الكود (اختياري)" value={code} maxLength={MAX.code} onChange={(e) => setCode(e.target.value)} spellCheck={false} />
      )}
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
      setMsg("يمكنك الرد مرة أخرى بعد 30 ثانية.");
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
      setMsg("حدث خطأ أثناء إرسال الرد. حاول مرة أخرى.");
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
            <HelpfulButton user={user} questionId={question.id} reply={r} />
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
        <p className="forum-meta">قم بتسجيل الدخول لتتمكن من الرد.</p>
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
      {items.length === 0 && <p className="tree-empty">لا توجد أسئلة منشورة بعد.</p>}
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
