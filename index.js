document.querySelectorAll("[data-dialog]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
        e.preventDefault();
        document.getElementById(btn.dataset.dialog).showModal();
    });
});
document.querySelectorAll(".lang-dialog").forEach(function (dlg) {
    dlg.querySelector(".dialog-close").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
});


/* صور الأيقونات: لو صورة مش موجودة، يرجع الإيموجي بتاعها (متخزن في data-fallback) */
document.querySelectorAll(".icon img[data-fallback]").forEach(function (img) {
    function useFallback() {
        img.replaceWith(document.createTextNode(img.dataset.fallback));
    }
    if (img.complete && img.naturalWidth === 0) { useFallback(); }
    else { img.addEventListener("error", useFallback); }
});


var TELEGRAM_LINK = "https://t.me/+9X0OZJpuZsFjZDg0";


var NOTIFY_ENDPOINT = "https://formsubmit.co/ajax/c947c76e870a310bd6002305343d5a8e";

function notify(subject, fields) {
    var data = { _subject: subject, _template: "table", _captcha: "false", _honey: "" };
    Object.keys(fields).forEach(function (k) { data[k] = fields[k]; });
    fetch(NOTIFY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
    }).catch(function () {});
}

(function () {
    var questions = [
        { q: "ما الذي يجذب انتباهك أكثر عند التعامل مع التكنولوجيا؟", a: [
            ["programming", "كيف تُبنى البرامج والتطبيقات وكيف تعمل كوداتها من الداخل."],
            ["marketing", "الإعلانات المبتكرة، كيفية استهداف الجمهور، وجذب المتابعين."],
            ["languages", "قراءة المحتوى بلغات متعددة والتواصل مع ثقافات مختلفة."],
            ["design", "الألوان والأشكال وتصميم واجهات التطبيقات والمواقع لتكون جميلة وسهلة الاستخدام."],
            ["data", "كيف تتعلم الأنظمة الذكية من البيانات وتتخذ قرارات وتتنبأ بالنتائج."] ] },
        { q: "عند مواجهة مشكلة معقدة، كيف تبدأ في حلها؟", a: [
            ["programming", "تحليل المشكلة منطقياً وتفكيكها إلى خطوات صغيرة لتجربة الحل التقني."],
            ["marketing", "التفكير خارج الصندوق للبحث عن فكرة تسويقية أو طريقة إقناع مبتكرة."],
            ["languages", "البحث عن مصطلحات جديدة، القراءة، والاستماع لفهم السياق بدقة."],
            ["design", "رسم فكرة أولية وتجربة أشكال وتصاميم مختلفة حتى تظهر الفكرة بوضوح."],
            ["data", "جمع البيانات وتحليلها للوصول إلى نمط أو إجابة مبنية على الأرقام."] ] },
        { q: "ما هي بيئة العمل التي تجد فيها نفسك أكثر إبداعاً؟", a: [
            ["programming", "العمل الفردي أو مع فريق تقني بالتركيز العميق في كتابة الأكواد."],
            ["marketing", "بيئة حيوية تتطلب التفاعل مع الجمهور، متابعة الترندات، وتحليل البيانات."],
            ["languages", "بيئة دولية تتطلب التواصل، الترجمة، وإدارة المحتوى بلغات مختلفة."],
            ["design", "مساحة هادئة أو فريق إبداعي أعمل فيه على الأفكار البصرية وأجرب الأشكال."],
            ["data", "بيئة تعتمد على البحث والتجربة والتحليل، مع أدوات ذكاء اصطناعي وبيانات كبيرة."] ] },
        { q: "أي نوع من المهام اليومية تفضل القيام به؟", a: [
            ["programming", "بناء وتصميم الهياكل، تصحيح الأخطاء المنطقية، وإنشاء الأنظمة."],
            ["marketing", "كتابة البوستات الإبداعية، إطلاق الحملات، وتحليل سلوك الزوار."],
            ["languages", "ممارسة نطق الكلمات، قراءة المقالات الأجنبية، وتدقيق النصوص."],
            ["design", "تصميم الشعارات والمنشورات والواجهات وتنسيق العناصر بشكل متناسق."],
            ["data", "تنظيف البيانات، رسم الرسوم البيانية، واستخراج النتائج المفيدة منها."] ] },
        { q: "ما هي المهارة التي تحب تطويرها دائماً في وقت فراغك؟", a: [
            ["programming", "حل الألغاز والتحديات الذهنية وتعلم لغات برمجية جديدة."],
            ["marketing", "متابعة استراتيجيات النجاح للشركات وصناع المحتوى."],
            ["languages", "الاستماع للبودكاست العالمي وتعلم مفردات لغة جديدة."],
            ["design", "متابعة أعمال المصممين وتجربة أدوات التصميم وتقنياته الجديدة."],
            ["data", "تجربة أدوات الذكاء الاصطناعي ومتابعة أحدث تطوراته وتطبيقاته."] ] },
        { q: "ما هو الناتج النهائي للمشروع الذي تحلم بأن تصنعه بنفسك؟", a: [
            ["programming", "موقع إلكتروني، تطبيق موبايل، أو برنامج ذكي يستعمله الناس."],
            ["marketing", "حملة إعلانية ناجحة تحقق مبيعات خيالية وتنتشر على السوشيال ميديا."],
            ["languages", "كتاب مترجم، مدونة بلغات متعددة، أو إطلاق براند عالمي."],
            ["design", "هوية بصرية كاملة لعلامة تجارية أو تصميم واجهة تطبيق يحبه الناس."],
            ["data", "نموذج ذكي أو لوحة بيانات تساعد الشركات على اتخاذ قرارات أفضل."] ] },
        { q: "كيف تتعامل مع الأرقام والبيانات؟", a: [
            ["programming", "أستخدمها للتحقق من صحة المعادلات والمنطق البرمجي داخل الكود."],
            ["marketing", "أقرأها كإحصائيات لمعرفة أداء الإعلانات ونسبة تفاعل المتابعين."],
            ["languages", "أهتم أكثر بالنصوص والمفردات وكيفية توصيل المعنى بدقة بدلاً من الأرقام."],
            ["design", "أحولها إلى رسوم وإنفوجرافيك بسيطة وجميلة يفهمها الجميع."],
            ["data", "أحللها وأبحث فيها عن أنماط ومعلومات خفية تفيد في اتخاذ القرار."] ] },
        { q: "ما هو شعورك عند تعلم شيء جديد بالكامل؟", a: [
            ["programming", "الشغف بتجربته عملياً وتطبيقه بكتابة السطور البرمجية فوراً."],
            ["marketing", "الحماس لمعرفة كيف يمكن تسويقه ونشره ليوصل لأكبر عدد من الناس."],
            ["languages", "الفضول لمعرفة أصول المصطلحات وكيفية التعبير عنه بلغات مختلفة."],
            ["design", "الرغبة في تخيل شكله وتصميمه وتقديمه بصورة جذابة."],
            ["data", "الرغبة في معرفة كيف يعمل وكيف يمكن تحليله أو أتمتته بالبيانات والذكاء الاصطناعي."] ] }
    ];

    var results = {
        programming: ["البرمجة", "عقلك بيحب المنطق وبناء الحاجات من الصفر. ابدأ بتعلم البرمجة من الأساسيات."],
        marketing: ["الماركتنج", "عندك حس بالناس والأفكار. ابدأ بأساسيات التسويق الرقمي."],
        languages: ["اللغات", "بتحب التواصل وفهم الثقافات. ابدأ بتقوية الإنجليزي وجرّب الألماني."],
        design: ["التصميم", "عندك عين بتلاحظ الجمال والتفاصيل. ابدأ بأساسيات التصميم وأدواته المجانية."],
        data: ["تحليل البيانات والذكاء الاصطناعي", "بتحب تفهم الأنماط وتوصل لإجابات بالأرقام. ابدأ بأساسيات البيانات والذكاء الاصطناعي."]
    };

    var targets = {
        programming: "card-programming",
        marketing: "card-marketing",
        languages: "languages",
        design: "card-design",
        data: "card-data"
    };

    var current = 0;
    var answers = [];

    var box = document.getElementById("quiz-box");
    var resultBox = document.getElementById("quiz-result");
    var bar = document.getElementById("quiz-bar");
    var count = document.getElementById("quiz-count");
    var question = document.getElementById("quiz-question");
    var options = document.getElementById("quiz-options");
    var prev = document.getElementById("quiz-prev");
    var next = document.getElementById("quiz-next");

    function render() {
        var item = questions[current];
        count.textContent = "السؤال " + (current + 1) + " من " + questions.length;
        bar.style.width = ((current + 1) / questions.length * 100) + "%";
        question.textContent = item.q;
        options.innerHTML = "";

        item.a.forEach(function (opt) {
            var label = document.createElement("label");
            var input = document.createElement("input");
            input.type = "radio";
            input.name = "quiz-answer";
            input.value = opt[0];
            if (answers[current] === opt[0]) input.checked = true;
            input.addEventListener("change", function () {
                answers[current] = opt[0];
                next.disabled = false;
            });
            var span = document.createElement("span");
            span.textContent = opt[1];
            label.appendChild(input);
            label.appendChild(span);
            options.appendChild(label);
        });

        prev.style.visibility = current === 0 ? "hidden" : "visible";
        next.disabled = !answers[current];
        next.textContent = current === questions.length - 1 ? "اعرف مسارك" : "التالي";
    }

    function showResult() {
        var score = { programming: 0, marketing: 0, languages: 0, design: 0, data: 0 };
        answers.forEach(function (a) { score[a]++; });
        var best = "programming";
        Object.keys(score).forEach(function (k) {
            if (score[k] > score[best]) best = k;
        });
        document.getElementById("result-title").textContent = results[best][0];
        document.getElementById("result-text").textContent = results[best][1];
        document.getElementById("result-link").href = TELEGRAM_LINK;
        document.getElementById("result-link").textContent = "ادخل مجتمع " + results[best][0] + " 🚀";
        document.getElementById("result-link").setAttribute("target", "_blank");
        document.getElementById("result-link").onclick = function (e) { e.preventDefault(); window.open(TELEGRAM_LINK, "_blank"); };

        box.hidden = true;
        resultBox.hidden = false;

notify("🔥 نتيجة كويز جديدة - " + results[best][0], {
    "الاسم": document.getElementById("userName").value,
    "المسار": results[best][0],
    "الدرجات": "(" + "برمجة" + score.programming + ") تسويق (" + score.marketing + ") لغات (" + score.languages + ") تصميم (" + score.design + ") داتا (" + score.data + ")",
    "الوقت": new Date().toLocaleString("ar-EG")
});
    }

    next.addEventListener("click", function () {
        if (current < questions.length - 1) { current++; render(); }
        else { showResult(); }
    });

    prev.addEventListener("click", function () {
        if (current > 0) { current--; render(); }
    });

    document.getElementById("quiz-restart").addEventListener("click", function () {
        current = 0;
        answers = [];
        resultBox.hidden = true;
        box.hidden = false;
        render();
    });

    render();
})();



(function () {
  var resultBox = document.getElementById("quiz-result");
  var titleEl = document.getElementById("result-title");
  var textEl = document.getElementById("result-text");
  if (!resultBox || !textEl) return;

  function send(answer) {
    var track = titleEl ? titleEl.textContent.trim() : "غير معروف";
    notify("📝 فيد باك على آفاق - " + track, {
      "المسار": track,
      "الفيدباك": answer,
      "الوقت": new Date().toLocaleString("ar-EG")
    });
  }

  function build() {
    var old = document.getElementById("feedback-box");
    if (old) old.remove();

    var box = document.createElement("div");
    box.className = "fb";
    box.id = "feedback-box";

    var q = document.createElement("p");
    q.className = "fb-q";
    q.textContent = "هل النتيجة  كانت مفيدة؟";
    box.appendChild(q);

    var btns = document.createElement("div");
    btns.className = "fb-btns";

    function makeBtn(label, answer) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "fb-btn";
      b.textContent = label;
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(btns.children, function (x) { x.disabled = true; });
        b.classList.add("picked");
        var thanks = document.createElement("p");
        thanks.className = "fb-thanks";
        thanks.textContent = "شكراً لرأيك 🌷";
        box.appendChild(thanks);
        send(answer);
      });
      return b;
    }

    btns.appendChild(makeBtn("👍 مفيده", "مفيده"));
    btns.appendChild(makeBtn("👎 غير مفيده", "غير مفيده"));
    box.appendChild(btns);

    textEl.insertAdjacentElement("afterend", box);
  }

  new MutationObserver(function () {
    if (!resultBox.hidden) build();
  }).observe(resultBox, { attributes: true, attributeFilter: ["hidden"] });
})();
