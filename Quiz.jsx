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

function notify(subject, fields) {
  const data = { _subject: subject, _template: "table", _captcha: "false", _honey: "", ...fields };
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
      <p className="fb-q">هل النتيجة  كانت مفيدة؟</p>
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

  const item = questions[current];
  const isLast = current === questions.length - 1;

  function choose(value) {
    const copy = [...answers];
    copy[current] = value;
    setAnswers(copy);
  }

  function showResult() {
    const score = { programming: 0, marketing: 0, languages: 0, design: 0, data: 0 };
    answers.forEach((a) => score[a]++);
    let top = "programming";
    Object.keys(score).forEach((k) => {
      if (score[k] > score[top]) top = k;
    });
    setBest(top);

    notify("🔥 نتيجة كويز جديدة - " + results[top][0], {
      "الاسم": name,
      "المسار": results[top][0],
      "الدرجات":
        "(برمجة" + score.programming + ") تسويق (" + score.marketing + ") لغات (" + score.languages +
        ") تصميم (" + score.design + ") داتا (" + score.data + ")",
      "الوقت": new Date().toLocaleString("ar-EG"),
    });
  }

  function restart() {
    setCurrent(0);
    setAnswers([]);
    setBest(null);
  }

  return (
    <section className="quiz-section" id="quiz-section">
      <div className="quiz-card" id="quiz">
        <h2>اكتشف مسارك</h2>
        <p className="quiz-subtitle">مش عارف تبدأ منين؟ 8 أسئلة صغيرة هيوضحولك طريقك.</p>
        <input type="text" id="userName" placeholder="اكتب اسمك" value={name} onChange={(e) => setName(e.target.value)} />

        {best === null ? (
          <div id="quiz-box">
            <div className="quiz-progress">
              <span id="quiz-bar" style={{ width: ((current + 1) / questions.length) * 100 + "%" }}></span>
            </div>
            <p className="quiz-count">السؤال {current + 1} من {questions.length}</p>
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
              <button type="button" className="quiz-btn" disabled={!answers[current]} onClick={() => (isLast ? showResult() : setCurrent(current + 1))}>
                {isLast ? "اعرف مسارك" : "التالي"}
              </button>
            </div>
          </div>
        ) : (
          <div className="quiz-result">
            <p className="quiz-result-label">المسار الأنسب ليك هو</p>
            <h3>{results[best][0]}</h3>
            <p>{results[best][1]}</p>
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
