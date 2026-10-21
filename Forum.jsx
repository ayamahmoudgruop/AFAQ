import React, { useState } from "react";
import { NOTIFY_ENDPOINT } from "./data.js";

export default function Forum() {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  const canSend = name.trim() && title.trim() && body.trim();

  function send(e) {
    e.preventDefault();
    if (!canSend || busy) return;
    setBusy(true);
    setFailed(false);
    fetch(NOTIFY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: "❓ سؤال جديد من المنتدى - " + title,
        "الاسم": name,
        "عنوان السؤال": title,
        "شرح السؤال": body,
        "الكود": code.trim() || "(بدون كود)",
        "الوقت": new Date().toLocaleString("ar-EG"),
      }),
    })
      .then((res) => {
        if (res.ok) {
          setSent(true);
        } else {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true))
      .finally(() => setBusy(false));
  }

  if (sent) {
    return <p className="forum-thanks">تم إرسال سؤالك ✅ هيوصل الرد قريباً.</p>;
  }

  return (
    <form className="forum-form" onSubmit={send}>
      <input className="forum-input" type="text" placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="forum-input" type="text" placeholder="عنوان السؤال" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="forum-input" placeholder="اشرح سؤالك" value={body} onChange={(e) => setBody(e.target.value)} />
      <textarea
        className="forum-input forum-code"
        placeholder="الكود (اختياري)"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
      />
      {failed && <p className="forum-error">حصلت مشكلة في الإرسال، جرّب تاني.</p>}
      <button type="submit" className="quiz-btn" disabled={!canSend || busy}>
        {busy ? "جاري الإرسال..." : "أرسل السؤال"}
      </button>
    </form>
  );
}
