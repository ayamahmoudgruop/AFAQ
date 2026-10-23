import React, { useRef, useState } from "react";

const STARTER = `<h1>مرحباً</h1>
<p>غيّر الكود واضغط شغّل</p>
<style>
  body { font-family: sans-serif; text-align: center; }
  h1 { color: #3b2a6b; }
</style>`;

export default function CodeBox() {
  const [code, setCode] = useState(STARTER);
  const [preview, setPreview] = useState(STARTER);
  const [copied, setCopied] = useState(false);

  const resultRef = useRef(null);

  function run() {
    setPreview(code);
    // ينزل للنتيجة على طول عشان الزائر يشوفها
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  }

  function copy() {
    if (!navigator.clipboard) return;
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  return (
    <section className="codebox-section" id="try-code">
      <h2>جرّب الكود بنفسك</h2>
      <p className="codebox-hint">اكتب كود الويب وشوف النتيجة على طول</p>
      <textarea
        className="codebox-input"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
      />
      <div className="codebox-actions">
        <button type="button" className="quiz-btn" onClick={run}>شغّل ▶</button>
        <button type="button" className="quiz-btn ghost" onClick={copy}>
          {copied ? "تم النسخ ✓" : "انسخ الكود"}
        </button>
      </div>
      <p className="codebox-result-label" ref={resultRef}>النتيجة:</p>
      <iframe className="codebox-preview" title="النتيجة" sandbox="allow-scripts" srcDoc={preview} />
    </section>
  );
}
