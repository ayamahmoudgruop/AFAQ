import React, { useEffect, useRef, useState } from "react";
import Forum, { UserProfile } from "./Forum.jsx";
import { ABOUT_TEXT, tracks, languages, resources, TELEGRAM_LINK, stageTests } from "./data.js";
import CodeBox from "./CodeBox.jsx";
import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { loadUserData, saveUserData, saveLeaderboard } from "./sync.js";
import { collection, query, where, orderBy, limit, onSnapshot, doc } from "firebase/firestore";
import { db } from "./firebase.js";

const LEVELS = ["مبتدئ", "متوسط", "متقدم"];
const TRACK_TITLES = {
  programming: "البرمجة",
  marketing: "التسويق",
  design: "التصميم",
  data: "تحليل البيانات",
  ai: "الذكاء الاصطناعي",
  cyber: "الأمن السيبراني",
};

/* أيقونة: لو الصورة مش موجودة يظهر الإيموجي بدلها */
function Icon({ color, src, alt, fallback }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <div className={"icon " + color}>
      {failed ? fallback : <img ref={imgRef} src={src} alt={alt} onError={() => setFailed(true)} />}
    </div>
  );
}

/* نافذة منبثقة (dialog) */
function Modal({ open, onClose, title, className = "", children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={"lang-dialog " + className}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="dialog-head">
        <h3>{title}</h3>
        <button type="button" className="dialog-close" aria-label="إغلاق" onClick={onClose}>✕</button>
      </div>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}

/* اختبار تحديد المسار المهني الشامل */
function CareerQuiz({ user }) {
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scores, setScores] = useState({ programming: 0, marketing: 0, design: 0, data: 0, ai: 0, cyber: 0 });
  const [resultTrack, setResultTrack] = useState(null);

  const quizData = [
    {
      question: "ما هو النشاط الذي تجد متعة حقيقية في القيام به أوقات فراغك؟",
      options: [
        { text: "تطوير وبناء المواقع وتطبيقات الويب وحل المشكلات البرمجية", track: "programming" },
        { text: "ابتكار تصاميم بصرية، شعارات، وواجهات مستخدم جذابة", track: "design" },
        { text: "جمع وترتيب البيانات وتحويلها إلى أرقام وإحصائيات مفهومة", track: "data" },
        { text: "إدارة الحملات الإعلانية والتواصل مع الجمهور وبناء العلامات التجارية", track: "marketing" },
        { text: "استكشاف أدوات الذكاء الاصطناعي وتدريب النماذج الذكية", track: "ai" },
        { text: "استكشاف ثغرات الأنظمة وحماية الشبكات والمعلومات الشخصية", track: "cyber" }
      ]
    },
    {
      question: "عندما تواجه مشكلة معقدة، كيف تفضل عادةً التعامل معها؟",
      options: [
        { text: "تقسيم المشكلة إلى خوارزميات وكتابة كود لحلها", track: "programming" },
        { text: "التركيز على تحسين الشكل الجمالي وتجربة المستخدم لتبسيطها", track: "design" },
        { text: "الاعتماد على الأرقام والقرارات المبنية على الحقائق والتحليل", track: "data" },
        { text: "دراسة سلوك الناس واختبار رسائل تسويقية مؤثرة", track: "marketing" },
        { text: "استخدام تقنيات الذكاء الاصطناعي لتوليد أفكار وحلول سريعة", track: "ai" },
        { text: "فحص نقاط الضعف واتخاذ إجراءات وقائية أمنية صارمة", track: "cyber" }
      ]
    },
    {
      question: "أي من هذه العبارات تصف شغفك المستقبلي بشكل أقرب؟",
      options: [
        { text: "أن أكون مطور برمجيات ومواقع محترف يبتكر تطبيقات متكاملة", track: "programming" },
        { text: "أن أصبح مصمم إبداعي يترك بصمة بصرية مميزة في كل مشروع", track: "design" },
        { text: "أن أكون خبير تحليل بيانات يساعد المؤسسات على اتخاذ قرارات صائبة", track: "data" },
        { text: "أن أقود استراتيجيات التسويق الرقمي وأصنع شهرة واسعة للشركات", track: "marketing" },
        { text: "أن أتخصص في هندسة الذكاء الاصطناعي والتقنيات الذكية المتقدمة", track: "ai" },
        { text: "أن أحمي الأصول الرقمية وأتخصص في مجال الأمن السيبراني بحذر", track: "cyber" }
      ]
    }
  ];

  function handleSelect(track) {
    const nextScores = { ...scores, [track]: scores[track] + 1 };
    setScores(nextScores);
    if (currentIdx + 1 < quizData.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // حساب المسار الأعلى نقاطاً
      let bestTrack = "programming";
      let maxScore = -1;
      Object.keys(nextScores).forEach((t) => {
        if (nextScores[t] > maxScore) {
          maxScore = nextScores[t];
          bestTrack = t;
        }
      });
      setResultTrack(bestTrack);
    }
  }

  function resetQuiz() {
    setStarted(false);
    setCurrentIdx(0);
    setScores({ programming: 0, marketing: 0, design: 0, data: 0, ai: 0, cyber: 0 });
    setResultTrack(null);
  }

  return (
    <section className="quiz-section" id="quiz-section">
      <div className="quiz-card">
        {!started ? (
          <div className="quiz-intro">
            <h2>اختبار تحديد المسار المهني ✨</h2>
            <p>لست متأكداً من المسار الأنسب لشغفك؟ أجب عن هذه الأسئلة القصيرة واكتشف التخصص التقني أو الإبداعي الذي يتناسب مع قدراتك وطموحاتك.</p>
            <button type="button" className="quiz-btn" onClick={() => setStarted(true)}>ابدأ الاختبار الآن 🚀</button>
          </div>
        ) : resultTrack ? (
          <div className="quiz-result">
            <h3>🎉 النتيجة: مسارك الأنسب هو ({TRACK_TITLES[resultTrack]})!</h3>
            <p>بناءً على إجاباتك، يبدو أن لديك شغفاً وقدرات ممتازة تؤهلك للنجاح والابداع في مجال {TRACK_TITLES[resultTrack]}. خطوتك القادمة تبدأ بالدخول إلى المسار والبدء في كورسات الصعود نحو القمة.</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px", flexWrap: "wrap" }}>
              <a href={"#/" + resultTrack} className="quiz-btn">ابدأ مسار {TRACK_TITLES[resultTrack]} ⛰️</a>
              <button type="button" className="quiz-btn ghost" onClick={resetQuiz}>أعد الاختبار 🔄</button>
            </div>
          </div>
        ) : (
          <div className="quiz-question-box">
            <p className="forum-meta">السؤال {currentIdx + 1} من {quizData.length}</p>
            <h3 className="quiz-test-q">{quizData[currentIdx].question}</h3>
            <div className="quiz-options" style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
              {quizData[currentIdx].options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  className="quiz-option-btn"
                  onClick={() => handleSelect(opt.track)}
                  style={{
                    padding: "12px 16px",
                    background: "rgba(165, 139, 220, 0.15)",
                    border: "1px solid #a58bdc",
                    borderRadius: "12px",
                    color: "#ede7f8",
                    textAlign: "right",
                    cursor: "pointer",
                    fontWeight: "bold",
                    transition: "all 0.2s"
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* اختبار الكورس: أسئلة واحدة واحدة، والنجاح من 70% */
function CourseQuiz({ course, onPass }) {
  const qs = course.test || [];
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState(null);

  function next() {
    if (picked === null) return;
    const final = score + (picked === qs[idx].answer ? 1 : 0);
    if (idx + 1 < qs.length) {
      setScore(final);
      setIdx(idx + 1);
      setPicked(null);
      return;
    }
    const ok = final / qs.length >= 0.7;
    setResult(ok ? "pass" : "fail");
    if (ok) onPass();
  }

  function retry() {
    setIdx(0);
    setPicked(null);
    setScore(0);
    setResult(null);
  }

  if (result === "pass") return <p className="forum-thanks">🎉 نجحتي في الاختبار، والمرحلة الجاية اتفتحت لو خلصتي الكورسات كلها.</p>;

  if (result === "fail") {
    return (
      <div className="quiz-test">
        <p>محتاجة تحاولي تاني عشان تنجحي (70% على الأقل).</p>
        <button type="button" className="quiz-btn" onClick={retry}>حاول تاني</button>
      </div>
    );
  }

  const q = qs[idx];
  return (
    <div className="quiz-test">
      <p className="forum-meta">سؤال {idx + 1} من {qs.length}</p>
      <p className="quiz-test-q">{q.q}</p>
      <div className="quiz-options">
        {q.options.map((opt, i) => (
          <label key={i}>
            <input type="radio" name={"t-" + course.title} checked={picked === i} onChange={() => setPicked(i)} />
            <span>{opt}</span>
          </label>
        ))}
      </div>
      <button type="button" className="quiz-btn" disabled={picked === null} onClick={next}>
        {idx + 1 === qs.length ? "خلّص الاختبار" : "التالي"}
      </button>
    </div>
  );
}

function findCourse(title) {
  for (const k of Object.keys(tracks)) {
    const c = tracks[k].find((x) => x.title === title);
    if (c) return c;
  }
  return null;
}

/* تقدم المسار */
function TrackProgress({ courses, done }) {
  if (!courses || courses.length === 0) return null;
  const total = courses.length;
  const finished = courses.filter((c) => done.includes(c.title)).length;
  const pct = Math.round((finished / total) * 100);
  return (
    <div className="track-progress">
      <p>تم إنهاء {finished} من {total} كورسات</p>
      <div className="track-bar"><span style={{ width: pct + "%" }} /></div>
    </div>
  );
}

function readRoute() {
  return window.location.hash.replace(/^#\/?/, "");
}

function earnedBadges(trackTitle, courses, done) {
  const list = courses || [];
  const badges = list
    .filter((c) => done.includes(c.title))
    .map((c) => ({ key: "c-" + c.title, label: "🏅 محترف " + (c.badge || c.title) }));
  if (list.length > 0 && list.every((c) => done.includes(c.title))) {
    badges.push({ key: "track-" + trackTitle, label: "🏆 محترف " + trackTitle });
  }
  return badges;
}

function Celebration() {
  const pieces = Array.from({ length: 28 });
  return (
    <div className="confetti-wrap" aria-hidden="true">
      {pieces.map((_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: (i * 37) % 100 + "%",
            animationDelay: (i % 7) * 0.2 + "s",
            background: ["#a58bdc", "#3b2a6b", "#ede7f8", "#f5c542"][i % 4],
          }}
        />
      ))}
      <p className="celebrate-text">🎉 تم إنهاء المسار كله!</p>
    </div>
  );
}

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch (e) {
    return fallback;
  }
}

function NotificationsBox({ user }) {
  const [mine, setMine] = useState([]);
  const [counts, setCounts] = useState({});
  const [seen, setSeen] = useState(() => readJSON("afaq-seen", {}));

  useEffect(() => {
    if (!user) {
      setMine([]);
      return;
    }
    const q = query(collection(db, "questions"), where("uid", "==", user.uid), limit(30));
    return onSnapshot(q, (snap) =>
      setMine(snap.docs.map((d) => ({ id: d.id, title: d.data().title || "" })))
    );
  }, [user]);

  const idsKey = mine.map((m) => m.id).join(",");
  useEffect(() => {
    const unsubs = mine.map((m) =>
      onSnapshot(collection(db, "questions", m.id, "replies"), (snap) =>
        setCounts((prev) => ({ ...prev, [m.id]: snap.size }))
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [idsKey]);

  useEffect(() => {
    const updates = {};
    mine.forEach((m) => {
      if (seen[m.id] === undefined && counts[m.id] !== undefined) updates[m.id] = counts[m.id];
    });
    if (Object.keys(updates).length) {
      const next = { ...seen, ...updates };
      setSeen(next);
      try {
        localStorage.setItem("afaq-seen", JSON.stringify(next));
      } catch (e) {}
    }
  }, [counts, mine]);

  function markSeen(id) {
    const next = { ...seen, [id]: counts[id] || 0 };
    setSeen(next);
    try {
      localStorage.setItem("afaq-seen", JSON.stringify(next));
    } catch (e) {}
  }

  if (!user) {
    return <p className="notif-empty">سجّل دخول عشان توصلك إشعارات الردود على أسئلتك.</p>;
  }

  const fresh = mine
    .map((m) => ({ ...m, unseen: (counts[m.id] || 0) - (seen[m.id] || 0) }))
    .filter((m) => m.unseen > 0);

  return (
    <div className="notif-box">
      <p className="dash-sub">الإشعارات</p>
      {fresh.length === 0 && <p className="notif-empty">لا توجد ردود جديدة.</p>}
      {fresh.map((m) => (
        <a key={m.id} href="#/forum" className="notif-item" onClick={() => markSeen(m.id)}>
          💬 ردّ جديد على: {m.title} ({m.unseen})
        </a>
      ))}
    </div>
  );
}

function CodeCard() {
  const [open, setOpen] = useState(false);
  return (
    <div className="side-card code-card">
      <button type="button" className="code-card-btn" onClick={() => setOpen(!open)}>
        🧪 جرّب الكود بنفسك {open ? "▲" : "▼"}
      </button>
      {open && <CodeBox />}
    </div>
  );
}

function StudentPanel({ track, courses, done, user }) {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState(null);
  const badges = earnedBadges(track, courses, done);
  const trackName = (languages.find((l) => l.key === track) || {}).title || TRACK_TITLES[track] || "";

  return (
    <div className="acc-wrap">
      <button
        type="button"
        className="acc-menu-btn acc-toggle"
        aria-label="القايمة"
        onClick={() => {
          setOpen(!open);
          setSub(null);
        }}
      >
        ☰
      </button>

      {open && (
        <div className="side-card">
          <p className="forum-meta">
            {user ? "أهلاً " + (user.displayName || "") : "أنت زائر، سجّل دخول عشان تحفظ تقدمك"}
          </p>
          <p className="forum-meta">المسار: {trackName}</p>

          <div className="acc-menu">
            <button type="button" onClick={() => setSub(sub === "notif" ? null : "notif")}>🔔 الإشعارات</button>
            <button type="button" onClick={() => setSub(sub === "badges" ? null : "badges")}>🏅 الشارات</button>
            <button
              type="button"
              onClick={() => {
                try {
                  const cur = localStorage.getItem("afaq-climber") || "girl";
                  localStorage.setItem("afaq-climber", cur === "boy" ? "girl" : "boy");
                  window.dispatchEvent(new Event("afaq-climber-change"));
                } catch (e) {}
              }}
            >
              🧗 تغيير الشخصية
            </button>
            {user && (
              <button type="button" onClick={() => signOut(auth)}>🚪 تسجيل الخروج</button>
            )}
          </div>

          {sub === "notif" && <NotificationsBox user={user} />}
          {sub === "badges" && (
            <div className="badge-list">
              {badges.length === 0 && <p className="forum-meta">الشارات هتظهر هنا عند إنهاء أي كورس.</p>}
              {badges.map((b) => (
                <span key={b.key} className="badge-chip">{b.label}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TelegramCard() {
  return (
    <div className="side-card">
      <h4>مجتمع آفاق على تليجرام</h4>
      <p className="forum-meta">تابع الأخبار وشارك مع الطلبة التانيين.</p>
      <a className="quiz-btn" href={TELEGRAM_LINK} target="_blank" rel="noreferrer">انضم للمجتمع 🚀</a>
    </div>
  );
}

function Leaderboard({ user }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(false);
  useEffect(() => {
    const q = query(collection(db, "leaderboard"), orderBy("score", "desc"), limit(20));
    return onSnapshot(
      q,
      (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setErr(true)
    );
  }, []);
  if (err) return <p className="forum-error">تعذّر تحميل المتصدرين، حدّث الصفحة.</p>;
  if (rows.length === 0) return <p className="tree-empty">لسه مفيش متصدرين، ابدأي الكورسات وكوني أول واحد.</p>;
  return (
    <div className="lb-list">
      {rows.map((r, i) => (
        <div key={r.id} className={"lb-row" + (user && user.uid === r.id ? " me" : "")}>
          <span className="lb-rank">{i + 1}</span>
          <span className="lb-name">{r.name}{user && user.uid === r.id ? " (أنت)" : ""}</span>
          <span className="lb-score">{r.score} كورس</span>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ title, courses, done, onSelect }) {
  const list = courses || [];
  const total = list.length;
  const finished = list.filter((c) => done.includes(c.title)).length;
  const pct = total ? Math.round((finished / total) * 100) : 0;
  const xp = finished * 10;
  const levels = LEVELS.map((lv, i) => {
    const inLevel = list.filter((c) => c.level === lv);
    const prev = i === 0 ? [] : list.filter((c) => c.level === LEVELS[i - 1]);
    const open = i === 0 || (prev.length > 0 && prev.every((c) => done.includes(c.title)));
    return { lv, open, has: inLevel.length > 0 };
  });
  const goTo = (lv) => {
    if (onSelect) onSelect(lv);
  };
  return (
    <div className="sec-header">
      <span className="sec-kicker">رحلة الصعود لقمة آفاق</span>
      <h2 className="sec-title">{title}</h2>
      <div className="sec-stats">
        <div className="sec-stat"><span>النقاط</span><strong>{xp} XP</strong></div>
        <div className="sec-stat"><span>الارتفاع</span><strong>{pct}m</strong></div>
        <button type="button" className="sec-sound" disabled title="قريباً">🔊</button>
      </div>
      <div className="sec-levels">
        {levels.map((l, i) => (
          <button
            key={l.lv}
            type="button"
            className={"sec-level" + (l.open ? "" : " locked") + (!l.has ? " empty" : "")}
            disabled={!l.open || !l.has}
            onClick={() => goTo(l.lv)}
          >
            <span className="sec-level-num">{i + 1}</span>
            <span>{l.lv}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ===== الجبل: المسار + فقاعات المستويات + فقاعات الكورسات + الشخصية + خط التقدم ===== */
const PATH = [
  { x: 16, y: 88 },
  { x: 40, y: 62 },
  { x: 68, y: 36 },
  { x: 84, y: 12 },
];
const mix = (p, q, f) => ({ x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f });

function MountainView({ courses, done, onPick, level, onLevel, climber, onClimber }) {
  const [shown, setShown] = useState(level);
  const idx = Math.max(0, LEVELS.indexOf(level));
  const isOpenLevel = (i) => {
    if (i === 0) return true;
    const prev = (courses || []).filter((c) => c.level === LEVELS[i - 1]);
    return prev.length > 0 && prev.every((c) => done.includes(c.title));
  };
  const inLevel = (courses || []).filter((c) => c.level === level);
  const ordered = LEVELS.flatMap((lv) => (courses || []).filter((c) => c.level === lv));
  const locked = new Set();
  ordered.forEach((c, i) => {
    if (i > 0 && !done.includes(ordered[i - 1].title) && !done.includes(c.title)) locked.add(c.title);
  });
  const nextTitle = ordered.find((c) => !done.includes(c.title) && !locked.has(c.title))?.title;
  const segFrom = PATH[idx];
  const segTo = PATH[idx + 1] || PATH[idx];
  const n = inLevel.length;
  const courseAt = (j) => {
    const p = mix(segFrom, segTo, (j + 1) / (n + 1));
    return { x: p.x + (j % 2 === 0 ? -5 : 5), y: p.y };
  };
  const doneHere = inLevel.filter((c) => done.includes(c.title)).length;
  const climberPos = doneHere === 0 ? segFrom : courseAt(Math.m