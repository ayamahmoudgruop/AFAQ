import React, { useEffect, useRef, useState } from "react";
import Quiz from "./Quiz.jsx";
import { ABOUT_TEXT, tracks, languages } from "./data.js";

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
function CourseTree({ courses, onPick }) {
  if (!courses || courses.length === 0) {
    return <p className="tree-empty">قريباً 🌱 الكورسات هتتضاف قريباً</p>;
  }
  return (
    <div className="tree">
      {LEVELS.map((level) => {
        const list = courses.filter((c) => c.level === level);
        if (list.length === 0) return null;
        return (
          <div className="tree-level" key={level}>
            <div className="tree-node tree-level-name">{level}</div>
            {list.map((c) => (
              <div className="tree-node" key={c.title}>
                <button type="button" className="tree-course" onClick={() => onPick(c)}>{c.title}</button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [dialog, setDialog] = useState(null); // "about" | "english" | "german" | null
  const [course, setCourse] = useState(null);
  const [courseBack, setCourseBack] = useState(null);
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
          <a href="#" onClick={(e) => { e.preventDefault(); setDialog("about"); }}>من نحن</a>
        </nav>
      </header>

      <section className="hero">
        <img className="hero-img" src="/hero.jpg" alt="" />
        <div className="hero-content">
          <h1>مرحباً بكم في آفاق</h1>
          <h2>حلمك مش بعيد ..<br />خطوتك الأولى تبدأ من هنا.</h2>
          <p>منصة تؤهلك من الصفر بمسار<br />احترافي، عملي وواضح.</p>
          <a href="#quiz-section" className="hero-button">ابدأ التعلم ←</a>
        </div>
      </section>

      <Quiz />

      <section className="learning" id="learning">
        <h2>التعلم وتطوير المهارات</h2>
        <div className="title-line"></div>
        <div className="cards">
          <div className="card">
            <div className="paths-banner">المسارات التعليمية</div>
            <h3>مسارات تعليمية</h3>
            <p>اكتشف مسارك المناسب<br />لمستقبلك.</p>
          </div>

          <div className="card clickable" id="languages" onClick={() => setDialog("languages")}>
            <Icon color="green" src="/icon-languages.png" alt="اللغات" fallback="🌎" />
            <h3>اللغات</h3>
            <p>طور لغتك وكن أقرب<br />لفرص أفضل.</p>
          </div>

          <div className="card clickable" id="card-programming" onClick={() => setDialog("programming")}>
            <Icon color="blue" src="/icon-programming.png" alt="برمجة" fallback="💻" />
            <h3>برمجة</h3>
            <p>تعلم أساسيات البرمجة<br />واصنع مشروعك الخاص.</p>
          </div>

          <div className="card clickable" id="card-marketing" onClick={() => setDialog("marketing")}>
            <Icon color="pink" src="/icon-marketing.png" alt="ماركتنج" fallback="📣" />
            <h3>ماركتنج</h3>
            <p>اكتسب مهارات التسويق الرقمي<br />وابني علامتك الخاصة.</p>
          </div>

          <div className="card clickable" id="card-design" onClick={() => setDialog("design")}>
            <Icon color="orange" src="/icon-design.png" alt="تصميم" fallback="🎨" />
            <h3>تصميم</h3>
            <p>تعلم أساسيات التصميم<br />وحوّل أفكارك إلى أعمال جذابة.</p>
          </div>

          <div className="card clickable" id="card-data" onClick={() => setDialog("data")}>
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
          <div className="card">
            <Icon color="blue" src="/icon-platforms.png" alt="منصات للتدريب العملي للبرمجة" fallback="💻" />
            <h3>منصات للتدريب العملي للبرمجة</h3>
          </div>
          <div className="card">
            <Icon color="pink" src="/icon-community.png" alt="مجتمعات ومنتديات" fallback="💬" />
            <h3>مجتمعات ومنتديات للنقاش وحل المشاكل</h3>
          </div>
          <div className="card">
            <Icon color="purple" src="/icon-podcast.png" alt="بودكاست" fallback="🎧" />
            <h3>بودكاست </h3>
          </div>
        </div>
      </section>

      <Modal open={dialog === "about"} onClose={close} title="من نحن" className="about-dialog">
        <p>{ABOUT_TEXT}</p>
      </Modal>

      <Modal open={dialog === "languages"} onClose={close} title="اللغات">
        <div className="lang-grid">
          {languages.map((l) => (
            <button key={l.key} type="button" className="lang-item" onClick={() => setDialog(l.key)}>{l.title}</button>
          ))}
        </div>
      </Modal>

      {languages.map((l) => (
        <Modal key={l.key} open={dialog === l.key} onClose={close} title={l.title}>
          <CourseTree courses={tracks[l.key]} onPick={pick} />
        </Modal>
      ))}

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
            <a className="btn-course" href={course.href} target="_blank" rel="noreferrer">افتح الكورس</a>
            <button type="button" className="quiz-btn ghost" onClick={() => setDialog(courseBack)}>رجوع</button>
          </div>
        )}
      </Modal>

      {Object.keys(TRACK_TITLES).map((k) => (
        <Modal key={k} open={dialog === k} onClose={close} title={"مسار " + TRACK_TITLES[k]}>
          <CourseTree courses={tracks[k]} onPick={pick} />
        </Modal>
      ))}

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
  );
}
