import React, { useState } from "react";
import { questions, results, TELEGRAM_LINK, NOTIFY_ENDPOINT } from "./data.js";

// كل نتيجة وقسمها في الصفحة (لازم تطابق id الكارت في App.jsx)
const SECTION_IDS = {
  programming: "card-programming",
  marketing: "card-marketing",
  languages: "languages",
  design: "card-design",
  data: "card-data",
};

const TRACK_KEYS = ["programming", "marketing", "languages", "design", "data"];

// سؤال الوقت: آخر سؤال في الاختبار
const TIME_QUESTION = {
  q: "كم ساعة يوميًا يمكن تخصيصها للتعلم؟",
  a: [
    ["time1", "حتى ساعة"],
    ["time2", "من ساعة لساعتين"],
    ["time3", "أكثر من ساعتين"],
  ],
};

// الخطة حسب الوقت المختار
const PLANS = {
  time1: "خطوات قصيرة، كل مرحلة تتقسم لأجزاء صغيرة، ومدة المرحلة حوالي أسبوعين.",
  time2: "مرحلة كل أسبوع، ومع كل مرحلة تمرين عملي.",
  time3: "مرحلة كل 3 إلى 4 أيام، ومشروع صغير بعد كل مرحلة.",
};

const ALL_QUESTIONS = [...questions, TIME_QUESTION];

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

export default function Quiz() {
  const [name, setName] = useState("");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [best, setBest] = useState(null);
  const [second, setSecond] = useState(null);
  const [time, setTime] = useState(null);

  const item = ALL_QUESTIONS[current];
  const isLast = current === ALL_QUESTIONS.length - 1;

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
        <p className="quiz-subtitle">مش عارف تبدأ منين؟ 9 أسئلة صغيرة هيوضحولك طريقك.</p>
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

            <Feedback track={results[best][0]} />
            <div className="quiz-nav">
              <a href={TELEGRAM_LINK} target="_blank" rel="noreferrer" className="quiz-btn">
                ادخل المجتمع 🚀
              </a>
              <a href={"#" + SECTION_IDS[best]} className="quiz-btn ghost">
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
