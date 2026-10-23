import React, { useEffect, useRef, useState } from "react";
import Quiz from "./Quiz.jsx";
import Forum, { UserProfile } from "./Forum.jsx";
import { ABOUT_TEXT, tracks, languages, resources, TELEGRAM_LINK } from "./data.js";
import CodeBox from "./CodeBox.jsx";
import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { loadUserData, saveUserData, saveLeaderboard } from "./sync.js";
import { collection, query, where, orderBy, limit, onSnapshot, doc } from "firebase/firestore";
import { db } from "./firebase.js";

const LEVELS = ["مبتدئ", "متوسط", "متقدم"];
const TRACK_TITLES = {
  programming: "البرمجة",
  marketing: "الماركتنج",
  design: "التصميم",
  data: "البيانات والذكاء الاصطناعي",
};

/* أيقونة: لو الصورة مش موجودة يظهر الإيموجي بدلها */
function Icon({ color, src, alt, fallback }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef(null);

  // لو الصورة فشلت قبل ما React يشتغل، نرجّع الإيموجي
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

/* شجرة الكورسات: مرتبة من مبتدئ لمتقدم */
const TREE_ICONS = { "مبتدئ": "🌱", "متوسط": "⚡", "متقدم": "🚀" };

function CourseTree({ courses, onPick, done }) {
  if (!courses || courses.length === 0) {
    return <p className="tree-empty">قريباً 🌱 الكورسات هتتضاف قريباً</p>;
  }
  const ordered = LEVELS.flatMap((level) => courses.filter((c) => c.level === level));
  const next = ordered.find((c) => !done.includes(c.title));
  // من فوق لتحت: متقدم في الأول والمبتدئ في الآخر، والمسار بيبدأ من تحت
  const topDown = [...LEVELS].reverse();
  return (
    <div className="tree">
      <div className="tree-anchor">التفوق</div>
      {topDown.map((level) => {
        const list = courses.filter((c) => c.level === level);
        if (list.length === 0) return null;
        return (
          <div className="tree-level" key={level}>
            <div className="tree-level-name">{level}</div>
            {list.map((c, i) => {
              const isDone = done.includes(c.title);
              return (
                <div
                  className={"tree-node " + (i % 2 === 0 ? "left" : "right") + (isDone ? " is-done" : "")}
                  key={c.title}
                >
                  <button type="button" className={"tree-course" + (isDone ? " is-done" : "")} onClick={() => onPick(c)}>
                    <span className="tree-icon">{TREE_ICONS[level] || "📘"}</span>
                    {isDone ? "✓ " : ""}{c.title}
                    {next && next.title === c.title && <span className="tree-next">التالي</span>}
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="tree-anchor bottom">بداية المسار</div>
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

/* تقدم المسار: عدد الكورسات اللي اتعملت */
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

/* شارات الإنجاز: كل كورس بيخلص يطلع له شارة، والمسار كله يطلع له شارة كبيرة */
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

/* احتفال بسيط لما المسار يوصل 100% */
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

/* إشعارات: الردود الجديدة على أسئلة المتعلم */
function NotificationsBox({ user }) {
  const [mine, setMine] = useState([]);
  const [counts, setCounts] = useState({});
  const [seen, setSeen] = useState(() => readJSON("afaq-seen", {}));

  // أسئلة المستخدم
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

  // عدد الردود على كل سؤال
  const idsKey = mine.map((m) => m.id).join(",");
  useEffect(() => {
    const unsubs = mine.map((m) =>
      onSnapshot(collection(db, "questions", m.id, "replies"), (snap) =>
        setCounts((prev) => ({ ...prev, [m.id]: snap.size }))
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [idsKey]);

  // أول مرة نشوف سؤال: نعتبر الردود الموجودة مقروءة
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

/* زرار ☰: بيفتح حساب المتعلم، وجواه الإشعارات والشارات وتسجيل الخروج */
function StudentPanel({ track, courses, done, user }) {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState(null); // null | "notif" | "badges"
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

/* مجتمع تليجرام لكل قسم */
function TelegramCard() {
  return (
    <div className="side-card">
      <h4>مجتمع آفاق على تليجرام</h4>
      <p className="forum-meta">تابع الأخبار وشارك مع الطلبة التانيين.</p>
      <a className="quiz-btn" href={TELEGRAM_LINK} target="_blank" rel="noreferrer">انضم للمجتمع 🚀</a>
    </div>
  );
}

/* لوحة المتصدرين */
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

/* صفحة كاملة لكل مسار / للغات / للمنتدى */
function PageView({ route, done, onPick, user }) {
  const back = (
    <a href="#" className="page-back" onClick={() => window.scrollTo(0, 0)}>
      الرجوع للرئيسية
    </a>
  );

  if (route.startsWith("u/")) {
    return (
      <section className="page">
        {back}
        <UserProfile uid={route.slice(2)} />
      </section>
    );
  }

  if (route === "leaderboard") {
    return (
      <section className="page">
        {back}
        <h2>المتصدرين</h2>
        <Leaderboard user={user} />
      </section>
    );
  }

  if (route === "forum") {
    return (
      <section className="page">
        {back}
        <h2>المنتدى</h2>
        <p className="forum-intro">اكتب سؤالك وكودك لو فيه، والرد هيوصلك.</p>
        <Forum />
      </section>
    );
  }

  if (route === "podcast" || route === "platforms") {
    const items = resources[route] || [];
    const pageTitle = route === "podcast" ? "بودكاست" : "منصات للتدريب العملي للبرمجة";
    return (
      <section className="page">
        {back}
        <h2>{pageTitle}</h2>
        {items.length === 0 ? (
          <p className="tree-empty">قريباً 🌱</p>
        ) : (
          <div className="resource-list">
            {items.map((r) => (
              <a key={r.title} className="resource-item" href={r.href} target="_blank" rel="noreferrer">
                <strong>{r.title}</strong>
                {r.desc && <span>{r.desc}</span>}
              </a>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (route === "languages") {
    return (
      <section className="page">
        {back}
        <h2>اللغات</h2>
        <div className="lang-grid">
          {languages.map((l) => (
            <a key={l.key} href={"#/" + l.key} className="lang-item">{l.title}</a>
          ))}
        </div>
      </section>
    );
  }

  const lang = languages.find((l) => l.key === route);
  const title = lang ? lang.title : TRACK_TITLES[route];
  if (!title) return null;
  return (
    <section className="page">
      {back}
      <h2>{title}</h2>
      <div className="track-layout">
        <div className="track-main">
          <TrackProgress courses={tracks[route]} done={done} />
          {tracks[route] && tracks[route].length > 0 &&
            tracks[route].every((c) => done.includes(c.title)) && <Celebration />}
          <CourseTree courses={tracks[route]} onPick={onPick} done={done} />
          <TelegramCard />
        </div>
        <aside className="track-side">
          <StudentPanel track={route} courses={tracks[route]} done={done} user={user} />
          {route === "programming" && <CodeBox />}
        </aside>
      </div>
    </section>
  );
}

export default function App() {
  const [dialog, setDialog] = useState(null); // "about" | "english" | "german" | null
  const [course, setCourse] = useState(null);
  const [courseBack, setCourseBack] = useState(null);
  const [pending, setPending] = useState(() => {
    try {
      return localStorage.getItem("afaq-pending") || "";
    } catch (e) {
      return "";
    }
  });
  // لما الطالب يرجع للموقع بعد ما فتح الكورس، نفتح كارت الكورس تاني عشان يعلّمه
  useEffect(() => {
    function onBack() {
      if (document.visibilityState !== "visible") return;
      let title = "";
      try {
        title = localStorage.getItem("afaq-pending") || "";
      } catch (e) {}
      const c = title ? findCourse(title) : null;
      if (!c) return;
      setPending(title);
      setCourse(c);
      setCourseBack(null);
      setDialog("course");
    }
    document.addEventListener("visibilitychange", onBack);
    return () => document.removeEventListener("visibilitychange", onBack);
  }, []);
  const [done, setDone] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("afaq-done") || "[]");
    } catch (e) {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("afaq-done", JSON.stringify(done));
    } catch (e) {}
  }, [done]);
  const [user, setUser] = useState(null);
  const [doneReady, setDoneReady] = useState(false);
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);
  // الكورسات المكتملة متزامنة على كل الأجهزة: أي تغيير يظهر فوراً
  const remoteDone = useRef(null);
  useEffect(() => {
    if (!user) {
      remoteDone.current = null;
      return;
    }
    let first = true;
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const remote = snap.exists() ? snap.data().done || [] : [];
        if (first) {
          first = false;
          // أول مرة: ندمج اللي على الجهاز مع اللي على الحساب
          setDone((prev) => Array.from(new Set([...prev, ...remote])));
        } else {
          setDone(remote);
        }
        remoteDone.current = JSON.stringify(remote);
        setDoneReady(true);
      },
      () => setDoneReady(true)
    );
    return unsub;
  }, [user]);

  // أي تغيير على الجهاز يتحفظ فوراً على الحساب (لو مختلف عن اللي محفوظ)
  useEffect(() => {
    if (!user || !doneReady) return;
    const key = JSON.stringify(done);
    if (key === remoteDone.current) return;
    remoteDone.current = key;
    saveUserData(user.uid, { done }).catch(() => {});
    saveLeaderboard(user.uid, user.displayName || "مستخدم", done.length).catch(() => {});
  }, [done, user, doneReady]);
  function toggleDone(title) {
    try {
      if (localStorage.getItem("afaq-pending") === title) localStorage.removeItem("afaq-pending");
    } catch (e) {}
    setPending("");
    setDone((prev) => (prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]));
  }
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const PAGE_ROUTES = ["forum", "leaderboard", "languages", "podcast", "platforms", ...Object.keys(TRACK_TITLES), ...languages.map((l) => l.key)];
  const isPage = PAGE_ROUTES.includes(route) || route.startsWith("u/");
  function go(r) {
    window.location.hash = r ? "/" + r : "";
    window.scrollTo(0, 0);
  }
  function pick(c) {
    setCourse(c);
    setCourseBack(dialog);
    setDialog("course");
  }
  const close = () => setDialog(null);

  return (
    <>
      <header className="header">
        <div className="logo">آفاق</div>
        <nav className="navbar">
          <a href="#" className="active">الرئيسية</a>
          <a href="#learning">الكورسات</a>
          <a href="#resources">الموارد المجانية</a>
          <a href="#/leaderboard">المتصدرين</a>
          <a href="#" onClick={(e) => { e.preventDefault(); setDialog("about"); }}>من نحن</a>
        </nav>
      </header>

      {isPage && <PageView route={route} done={done} onPick={pick} user={user} />}

      {!isPage && (
        <>
      <section className="hero">
        <img className="hero-img" src="/hero.jpg" alt="" />
        <div className="hero-content">
          <h1>مرحباً بكم في آفاق</h1>
          <h2>حلمك مش بعيد ..<br />خطوتك الأولى تبدأ من هنا.</h2>
          <p>منصة تؤهلك من الصفر بمسار<br />احترافي، عملي وواضح.</p>
          <a href="#quiz-section" className="hero-button">ابدأ التعلم ←</a>
        </div>
      </section>

      <Quiz user={user} />


      <section className="learning" id="learning">
        <h2>التعلم وتطوير المهارات</h2>
        <div className="title-line"></div>
        <div className="cards">
          <div className="card">
            <Icon color="purple" src="/icon-paths.png" alt="مسارات تعليمية" fallback="📖" />
            <h3>مسارات تعليمية</h3>
            <p>اكتشف مسارك المناسب<br />لمستقبلك.</p>
          </div>

          <div className="card clickable" id="languages" onClick={() => go("languages")}>
            <Icon color="green" src="/icon-languages.png" alt="اللغات" fallback="🌎" />
            <h3>اللغات</h3>
            <p>طور لغتك وكن أقرب<br />لفرص أفضل.</p>
          </div>

          <div className="card clickable" id="card-programming" onClick={() => go("programming")}>
            <Icon color="blue" src="/icon-programming.png" alt="برمجة" fallback="💻" />
            <h3>برمجة</h3>
            <p>تعلم أساسيات البرمجة<br />واصنع مشروعك الخاص.</p>
          </div>

          <div className="card clickable" id="card-marketing" onClick={() => go("marketing")}>
            <Icon color="pink" src="/icon-marketing.png" alt="ماركتنج" fallback="📣" />
            <h3>ماركتنج</h3>
            <p>اكتسب مهارات التسويق الرقمي<br />وابني علامتك الخاصة.</p>
          </div>

          <div className="card clickable" id="card-design" onClick={() => go("design")}>
            <Icon color="orange" src="/icon-design.png" alt="تصميم" fallback="🎨" />
            <h3>تصميم</h3>
            <p>تعلم أساسيات التصميم<br />وحوّل أفكارك إلى أعمال جذابة.</p>
          </div>

          <div className="card clickable" id="card-data" onClick={() => go("data")}>
            <Icon color="teal" src="/icon-data.png" alt="البيانات والذكاء الاصطناعي" fallback="📊" />
            <h3>البيانات والذكاء الاصطناعي</h3>
            <p>ابدأ رحلتك مع البيانات<br />وتعلم كيف تستفيد من الذكاء الاصطناعي.</p>
          </div>
        </div>
      </section>

      <section className="learning" id="resources">
        <h2>مصادر تعليمية</h2>
        <div className="title-line"></div>
        <div className="cards">
          <div className="card clickable" onClick={() => go("platforms")}>
            <Icon color="blue" src="/icon-platforms.png" alt="منصات للتدريب العملي للبرمجة" fallback="💻" />
            <h3>منصات للتدريب العملي للبرمجة</h3>
          </div>
          <div className="card clickable" onClick={() => go("forum")}>
            <Icon color="pink" src="/icon-community.png" alt="مجتمعات ومنتديات" fallback="💬" />
            <h3>مجتمعات ومنتديات للنقاش وحل المشاكل</h3>
          </div>
          <div className="card clickable" onClick={() => go("podcast")}>
            <Icon color="purple" src="/icon-podcast.png" alt="بودكاست" fallback="🎧" />
            <h3>بودكاست </h3>
          </div>
        </div>
      </section>

      <Modal open={dialog === "about"} onClose={close} title="من نحن" className="about-dialog">
        <p>{ABOUT_TEXT}</p>
      </Modal>


      <footer className="site-footer">
        <p className="footer-title">🚀 آفاق</p>
        <p className="footer-sub">دليلك لاكتشاف مسارك المهني</p>

        <div className="footer-row footer-row-first">
          <a href="https://mail.google.com/mail/?view=cm&to=ayamahmoud.gruop@gmail.com" target="_blank" rel="noreferrer" className="footer-link">تواصل معنا</a>
          <a href="https://www.instagram.com/aya__mahmoud188?stkn=NDFoNGhpejRldm9x" target="_blank" rel="noreferrer" className="footer-insta" aria-label="انستجرام">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="6"></rect>
              <circle cx="12" cy="12" r="5"></circle>
              <circle cx="17.5" cy="6.5" r="1.2" fill="white" stroke="none"></circle>
            </svg>
          </a>
        </div>

        <div className="footer-row">
          <a href="#quiz" className="footer-cta footer-cta-quiz">جرب الاختبار</a>
          <a href="https://wa.me/201105371577?text=السلام%20عليكم%20آية%20حابب%20اطلب%20موقع%20🚀%0Aنوع%20الموقع:%0Aالميزانية:" target="_blank" rel="noreferrer" className="footer-cta footer-cta-wa">اطلب موقع 🚀</a>
        </div>

        <p className="footer-note">
          AMG | Aya Mahmoud Group Digital Projects • Creative Work •<br />
          Ideas Building something new, one project at a time. © 2026<br />
          جميع الحقوق محفوظة لـ AMG
        </p>
      </footer>
        </>
      )}

      <Modal open={dialog === "course"} onClose={close} title={course ? course.title : ""}>
        {course && (
          <div className="course-card">
            <p className="course-level">{course.level}</p>
            <p>{course.desc || "وصف الكورس هيتضاف قريباً."}</p>
            {course.exercise && (
              <>
                <h4>تمرين</h4>
                <p>{course.exercise}</p>
              </>
            )}
            {pending === course.title && !done.includes(course.title) && (
              <p className="forum-meta">رجعت من الكورس؟ اضغط علّم كمكتمل لو خلصته.</p>
            )}
            <button type="button" className={"quiz-btn" + (done.includes(course.title) ? " ghost" : "")} onClick={() => toggleDone(course.title)}>
              {done.includes(course.title) ? "✓ تم الإنهاء (اضغط للتراجع)" : "علّم كمكتمل"}
            </button>
            <a
              className="btn-course"
              href={course.href}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                try {
                  localStorage.setItem("afaq-pending", course.title);
                } catch (e) {}
                setPending(course.title);
              }}
            >
              افتح الكورس
            </a>
            <p className="forum-meta">بعد ما تخلّص الكورس، ارجع واضغط علّم كمكتمل.</p>
            <button type="button" className="quiz-btn ghost" onClick={() => setDialog(courseBack)}>رجوع</button>
          </div>
        )}
      </Modal>
    </>
  );
}
