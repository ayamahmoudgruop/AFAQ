import React, { useEffect, useState } from "react";
import { questions, results, TELEGRAM_LINK, NOTIFY_ENDPOINT } from "./data.js";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase.js";
import { loadUserData, saveUserData } from "./sync.js";

// كل نتيجة وقسمها في الصفحة (لازم تطابق id الكارت في App.jsx)
const SECTION_IDS = {
  ai: "ai",
  cyber: "cyber",
  programming: "programming",
  marketing: "marketing",
  languages: "languages",
  design: "design",
  data: "data",
};

const TRACK_KEYS = ["programming", "marketing", "languages", "design", "data"];

// سؤال الوقت: آخر سؤال في الاختبار
const TIME_QUESTION = {
  q: "ما هي المدة الزمنية التي يمكنك تخصيصها للتعلم اليومي؟",
  a: [
    ["time1", "خطة المحارب (ساعة واحدة يومياً): تناسب أصحاب الجدول المزدحم لضمان استمرارية هادئة."],
    ["time2", "خطة المتوازن (من ساعتين إلى 3 ساعات يومياً): تتيح تقدماً ثابتاً وجاداً بمعدل متوسط."],
    ["time3", "خطة المكثف (4 ساعات فأكثر يومياً): لمن يفرغ نفسه للتعلم ويرغب في إنجاز المسار سريعاً."],
  ],
};

// الخطة حسب الوقت المختار
const PLANS = {
  time1: "خطة المحارب: ساعة يومياً، خطوات هادئة ومستمرة.",
  time2: "خطة المتوازن: من ساعتين لـ3 ساعات يومياً، تقدم ثابت وجاد.",
  time3: "خطة المكثف: 4 ساعات فأكثر يومياً، إنجاز المسار بأسرع شكل.",
};

const ALL_QUESTIONS = [...questions, TIME_QUESTION];

const RESULT_KEY = "afaq-result";

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(RESULT_KEY) || "null");
  } catch (e) {
    return null;
  }
}

function saveResult(data) {
  try {
    localStorage.setItem(RESULT_KEY, JSON.stringify(data));
  } catch (e) {}
}

function clearResult() {
  try {
    localStorage.removeItem(RESULT_KEY);
  } catch (e) {}
}

function timeLabel(value) {
  const found = TIME_QUESTION.a.find(([k]) => k === value);
  return found ? found[1] : "";
}

function notify(subject, fields) {
  const data = { _subject: subject, ...fields };
  fetch(NOTIFY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(data),
  }).catch(() => {});
}

function Feedback({ track }) {
  const [picked, setPicked] = useState(null);

  function send(answer) {
    setPicked(answer);
    notify("📝 فيد باك على آفاق - " + track, {
      "المسار": track,
      "الفيدباك": answer,
      "الوقت": new Date().toLocaleString("ar-EG"),
    });
  }

  return (
    <div className="fb" id="feedback-box">
      <p className="fb-q">هل النتيجة كانت مفيدة؟</p>
      <div className="fb-btns">
        <button type="button" className={"fb-btn" + (picked === "مفيده" ? " picked" : "")} disabled={picked !== null} onClick={() => send("مفيده")}>
          👍 مفيده
        </button>
        <button type="button" className={"fb-btn" + (picked === "غير مفيده" ? " picked" : "")} disabled={picked !== null} onClick={() => send("غير مفيده")}>
          👎 غير مفيده
        </button>
      </div>
      {picked && <p className="fb-thanks">شكراً لرأيك 🌷</p>}
    </div>
  );
}

export default function Quiz({ user }) {
  const saved = loadSaved();
  const [name, setName] = useState(saved?.name || "");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [best, setBest] = useState(saved?.best ?? null);
  const [second, setSecond] = useState(saved?.second ?? null);
  const [time, setTime] = useState(saved?.time ?? null);

  const item = ALL_QUESTIONS[current];
  const isLast = current === ALL_QUESTIONS.length - 1;

  // لو المستخدم مسجل ومفيش نتيجة على الجهاز، نجيب نتيجته من حسابه
  useEffect(() => {
    if (!user || best !== null) return;
    loadUserData(user.uid)
      .then((data) => {
        const r = data?.result;
        if (r && r.best) {
          setName(r.name || "");
          setBest(r.best);
          setSecond(r.second ?? null);
          setTime(r.time ?? null);
          saveResult(r);
        }
      })
      .catch(() => {});
  }, [user]);

  async function loginGoogle() {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {}
  }

  function choose(value) {
    const copy = [...answers];
    copy[current] = value;
    setAnswers(copy);
  }

  function showResult() {
    // الدرجات من أسئلة المجالات بس (من غير سؤال الوقت)
    const score = { programming: 0, marketing: 0, languages: 0, design: 0, data: 0 };
    answers.slice(0, questions.length).forEach((a) => {
      if (score[a] !== undefined) score[a]++;
    });

    let top = "programming";
    TRACK_KEYS.forEach((k) => {
      if (score[k] > score[top]) top = k;
    });

    // مجال قريب: درجته أقل من الأول بنقطة واحدة بالكتير، ومش صفر
    let alt = null;
    TRACK_KEYS.forEach((k) => {
      if (k !== top && score[k] > 0 && score[k] >= score[top] - 1) {
        if (alt === null || score[k] > score[alt]) alt = k;
      }
    });

    const t = answers[questions.length];
    setBest(top);
    setSecond(alt);
    setTime(t);
    const record = { name, best: top, second: alt, time: t };
    saveResult(record);
    if (user) saveUserData(user.uid, { result: record }).catch(() => {});

    notify("🔥 نتيجة كويز جديدة - " + results[top][0], {
      "الاسم": name,
      "المسار": results[top][0],
      "مجال قريب": alt ? results[alt][0] : "لا يوجد",
      "الوقت المتاح": timeLabel(t),
      "الدرجات":
        "(برمجة " + score.programming + ") تسويق (" + score.marketing + ") لغات (" + score.languages +
        ") تصميم (" + score.design + ") داتا (" + score.data + ")",
      "الوقت": new Date().toLocaleString("ar-EG"),
    });
  }

  function restart() {
    clearResult();
    setCurrent(0);
    setAnswers([]);
    setBest(null);
    setSecond(null);
    setTime(null);
  }

  return (
    <section className="quiz-section" id="quiz-section">
      <div className="quiz-card" id="quiz">
        <h2>اكتشف مسارك</h2>
        <p className="quiz-subtitle">مش عارف تبدأ منين؟ 7 أسئلة قصيرة هتوضحلك طريقك.</p>
        <input type="text" id="userName" placeholder="اكتب اسمك" value={name} onChange={(e) => setName(e.target.value)} />

        {best === null && current === 0 && !name.trim() && (
          <p className="quiz-hint">اكتب اسمك لتبدأ الاختبار</p>
        )}

        {best === null ? (
          <div id="quiz-box">
            <div className="quiz-progress">
              <span id="quiz-bar" style={{ width: ((current + 1) / ALL_QUESTIONS.length) * 100 + "%" }}></span>
            </div>
            <p className="quiz-count">السؤال {current + 1} من {ALL_QUESTIONS.length}</p>
            <h3 className="quiz-question">{item.q}</h3>
            <div className="quiz-options">
              {item.a.map(([value, text]) => (
                <label key={value}>
                  <input type="radio" name="quiz-answer" value={value} checked={answers[current] === value} onChange={() => choose(value)} />
                  <span>{text}</span>
                </label>
              ))}
            </div>
            <div className="quiz-nav">
              <button type="button" className="quiz-btn ghost" style={{ visibility: current === 0 ? "hidden" : "visible" }} onClick={() => setCurrent(current - 1)}>
                السابق
              </button>
              <button
                type="button"
                className="quiz-btn"
                disabled={!answers[current] || (current === 0 && !name.trim())}
                onClick={() => (isLast ? showResult() : setCurrent(current + 1))}
              >
                {isLast ? "اعرف مسارك" : "التالي"}
              </button>
            </div>
          </div>
        ) : (
          <div className="quiz-result">
            <p className="quiz-result-label">المسار الأنسب ليك هو</p>
            <h3>{results[best][0]}</h3>
            <p>{results[best][1]}</p>

            {time && (
              <p className="quiz-plan">
                <strong>الخطة المقترحة:</strong> {PLANS[time]}
              </p>
            )}

            {second && (
              <div className="quiz-alt">
                <p>قريب من اهتمامك:</p>
                <h4>{results[second][0]}</h4>
              </div>
            )}

            {!user && (
              <div className="quiz-save">
                <p>احفظ مسارك بحسابك، وكمّل من حيث وقفت.</p>
                <button type="button" className="quiz-btn ghost" onClick={loginGoogle}>سجّل دخول بجوجل</button>
              </div>
            )}
            <Feedback track={results[best][0]} />
            <div className="quiz-nav">
              <a href={TELEGRAM_LINK} target="_blank" rel="noreferrer" className="quiz-btn">
                ادخل المجتمع 🚀
              </a>
              <a href={"#/" + SECTION_IDS[best]} className="quiz-btn ghost">
                ابدأ التعلم
              </a>
            </div>
            <div className="quiz-nav">
              <button type="button" className="quiz-btn ghost" onClick={restart}>أعد الاختبار</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
