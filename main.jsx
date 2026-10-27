import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// لو حصل خطأ، يظهر على الشاشة نفسها بدل ما الصفحة تفضل فاضية
function showError(err) {
  const el = document.getElementById("root");
  const msg = (err && (err.stack || err.message)) || String(err);
  el.innerHTML =
    '<pre style="padding:16px;direction:ltr;text-align:left;font-size:12px;white-space:pre-wrap;color:#9b2c2c;background:#fff">' +
    msg.replace(/&/g, "&amp;").replace(/</g, "&lt;") +
    "</pre>";
}

window.addEventListener("error", (e) => showError(e.error || e.message));
window.addEventListener("unhandledrejection", (e) => showError(e.reason));

class ErrorBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  render() {
    if (this.state.err) {
      return (
        <pre style={{ padding: 16, direction: "ltr", textAlign: "left", fontSize: 12, whiteSpace: "pre-wrap", color: "#9b2c2c", background: "#fff" }}>
          {String(this.state.err.stack || this.state.err.message || this.state.err)}
        </pre>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <ErrorBox>
    <App />
  </ErrorBox>
);

// تسجيل PWA: الموقع يشتغل أوفلاين ويتثبّت على الشاشة الرئيسية
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
