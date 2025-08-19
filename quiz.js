(() => {
  if (window.__quizEngineLoaded) return;
  window.__quizEngineLoaded = true;

  // ---- Config ----
  const FILES = [
    "quiz_sections/foundational_assessment.json",
    "quiz_sections/hobby_preferences.json",
    "quiz_sections/kink_general.json",
    "quiz_sections/kink_specific.json",
    "quiz_sections/preference_strength.json",
    "quiz_sections/reflection.json",
    "quiz_sections/situational.json",
  ];
  const ARCHETYPES = ["Catalyst","Explorer","Keystone","Vanguard","Oracle","Connoisseur","Alchemist"];

  // ---- DOM (robust lookups) ----
  function $(...ids){ for (const id of ids){ const el=document.getElementById(id); if (el) return el; } return null; }
  const intro    = $("intro","intro-container");
  const quiz     = $("quiz","quiz-container");
  const startBtn = $("start","start-button");
  const backBtn  = $("back","back-button");
  const nextBtn  = $("next","next-button");
  const qText    = $("q-text","question-text");
  const qOptions = $("q-options","options-container");
  const pText    = $("progress-text");
  const pFill    = $("progress-fill");

  // quick diag
  console.log("[quiz] script loaded. startBtn:", !!startBtn);

  // ---- State ----
  let questions = [];
  let index = 0;
  let answers = {}; // { [id]: { idx?, value? } }
  let total = 0;

  // ---- Helpers ----
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function isAnswered(q, a) {
    if (!q) return false;
    if (q.type === "likert_scale" || q.type === "multiple_choice") return Number.isInteger(a?.idx);
    if (q.type === "numeric_scale") return typeof a?.value === "number";
    return true;
  }
  function bindNavForCurrent() {
    const q = questions[index];
    if (nextBtn) {
      nextBtn.textContent = index < total - 1 ? "Next" : "See results";
      nextBtn.disabled = !isAnswered(q, answers[q?.id]);
    }
  }
  function likertLegend(opts = []) {
    const norm = (opts || []).map(s => String(s).trim().toLowerCase());
    const joined = norm.join("|");
    const patterns = [
      { set:["strongly agree","somewhat agree","neutral","somewhat disagree","strongly disagree"], label:"Agree ← → Disagree" },
      { set:["strongly disagree","somewhat disagree","neutral","somewhat agree","strongly agree"], label:"Disagree ← → Agree" },
      { set:["extremely likely","very likely","neutral","unlikely","very unlikely"], label:"Likely ← → Unlikely" },
      { set:["very likely","likely","neutral","unlikely","very unlikely"], label:"Likely ← → Unlikely" },
      { set:["very unlikely","unlikely","neutral","likely","very likely"], label:"Unlikely ← → Likely" },
      { set:["extremely unlikely","very unlikely","neutral","likely","very likely"], label:"Unlikely ← → Likely" },
      { set:["extremely important","very important","moderately important","slightly important","not important"], label:"Important ← → Not important" },
      { set:["not important","slightly important","moderately important","very important","extremely important"], label:"Not important ← → Important" },
      { set:["always","often","sometimes","rarely","never"], label:"Always ← → Never" },
      { set:["never","rarely","sometimes","often","always"], label:"Never ← → Always" },
      { set:["very comfortable","comfortable","neutral","uncomfortable","very uncomfortable"], label:"Comfortable ← → Uncomfortable" },
      { set:["very uncomfortable","uncomfortable","neutral","comfortable","very comfortable"], label:"Uncomfortable ← → Comfortable" },
    ];
    for (const p of patterns) if (joined === p.set.join("|")) return p.label;
    const first = norm[0]||"", last = norm[norm.length-1]||"";
    if (first.includes("likely") && (last.includes("unlikely")||last.includes("not"))) return "Likely ← → Unlikely";
    if ((first.includes("unlikely")||first.includes("not")) && last.includes("likely")) return "Unlikely ← → Likely";
    if (first.includes("important") && last.includes("not")) return "Important ← → Not important";
    if (first.includes("not") && last.includes("important")) return "Not important ← → Important";
    if (first.includes("always") && last.includes("never")) return "Always ← → Never";
    if (first.includes("never") && last.includes("always")) return "Never ← → Always";
    if (first.includes("comfortable") && last.includes("uncomfortable")) return "Comfortable ← → Uncomfortable";
    if (first.includes("uncomfortable") && last.includes("comfortable")) return "Uncomfortable ← → Comfortable";
    return null;
  }

  // ---- Load questions (filter, dedupe, balance) ----
  async function loadAll() {
    const fetched = await Promise.all(
      FILES.map(async (file) => {
        const json = await fetch(file).then(r=>r.json()).catch(()=>({questions:[]}));
        const section = file.split("/").pop().replace(".json","");
        return { section, questions: Array.isArray(json.questions) ? json.questions : [] };
      })
    );

    let pool = fetched.flatMap(({ section, questions }) =>
      questions
        .filter(q => ["likert_scale","numeric_scale","multiple_choice"].includes(q?.type))
        .map(q => ({ ...q, __section: section }))
    );

    // Drop safety/consent gates and premature "identify archetype"
    const DROP_KEYWORDS = ["safety","safe word","safe-word","protocol","ssc","rack","consent","aftercare","negotiation","injury","emergency"];
    const DROP_IDS = ["identify_archetype","know_archetype","self_identify_archetype"];
    pool = pool.filter(q => {
      const id = String(q.id || "").toLowerCase();
      const text = String(q.question_text || q.text || "").toLowerCase();
      if (DROP_IDS.includes(id)) return false;
      if (DROP_KEYWORDS.some(k => text.includes(k))) return false;
      return true;
    });

    // Dedupe by id
    const seen = new Set();
    pool = pool.filter(q => {
      const id = String(q.id || "");
      if (!id || seen.has(id)) return false;
      seen.add(id); return true;
    });

    // Light stratification caps to avoid kink-heavy balance
    const CAPS = {
      foundational_assessment: 10,
      hobby_preferences: 8,
      kink_general: 8,
      kink_specific: 8,
      situational: 6,
      reflection: 6,
      preference_strength: 4
    };

    const groups = {};
    for (const q of pool) (groups[q.__section] ||= []).push(q);
    const picked = [];
    for (const [sec, arr] of Object.entries(groups)) {
      const cap = CAPS[sec] ?? arr.length;
      picked.push(...shuffle(arr).slice(0, cap));
    }

    questions = shuffle(picked);
    total = questions.length;

    // Debug counts
    const bySection = {}; const byArch = {};
    for (const q of questions) {
      bySection[q.__section] = (bySection[q.__section]||0)+1;
      if (q.archetype) byArch[q.archetype] = (byArch[q.archetype]||0)+1;
    }
    console.log("Question counts by section:", bySection);
    console.log("Question counts by archetype:", byArch);
    console.log("Total questions:", total);
  }

  // ---- Render ----
  function render() {
    const q = questions[index];
    if (!q) return;

    // progress
    if (pText) pText.textContent = `Question ${index+1} of ${total}`;
    if (pFill) pFill.style.width = `${Math.round(((index+1)/Math.max(1,total))*100)}%`;

    // text + options
    if (qText) qText.textContent = q.question_text || q.text || "Question";
    if (qOptions) qOptions.innerHTML = "";

    bindNavForCurrent();

    if (q.type === "likert_scale") {
      const opts = q.response_options || [];
      const legendText = likertLegend(opts);
      if (legendText) {
        const legend = document.createElement("div");
        legend.className = "likert-legend";
        legend.textContent = legendText;
        qOptions.appendChild(legend);
      }
      opts.forEach((opt,i) => {
        const btn = document.createElement("button");
        const active = answers[q.id]?.idx === i;
        btn.className = "option" + (active ? " active" : "");
        btn.textContent = opt;
        btn.setAttribute("aria-pressed", active ? "true" : "false");
        btn.addEventListener("click", () => {
          answers[q.id] = { idx:i, value:i };
          if (navigator.vibrate) navigator.vibrate(15);
          render();
        });
        qOptions.appendChild(btn);
      });

    } else if (q.type === "multiple_choice") {
      (q.response_options || []).forEach((opt,i) => {
        const btn = document.createElement("button");
        const active = answers[q.id]?.idx === i;
        btn.className = "option" + (active ? " active" : "");
        btn.textContent = opt;
        btn.setAttribute("aria-pressed", active ? "true" : "false");
        btn.addEventListener("click", () => {
          answers[q.id] = { idx:i, value:i };
          if (navigator.vibrate) navigator.vibrate(15);
          render();
        });
        qOptions.appendChild(btn);
      });

    } else if (q.type === "numeric_scale") {
      const min = Number.isFinite(q.min) ? q.min : 1;
      const max = Number.isFinite(q.max) ? q.max : 10;
      const wrap = document.createElement("div");
      const input = document.createElement("input");
      input.type = "range"; input.min = min; input.max = max; input.step = 1;
      input.value = answers[q.id]?.value ?? Math.round((min+max)/2);
      const out = document.createElement("div");
      out.textContent = String(input.value);
      out.style.marginTop = "6px";
      input.addEventListener("input", () => {
        answers[q.id] = { value: Number(input.value) };
        out.textContent = String(input.value);
        bindNavForCurrent();
      });
      wrap.appendChild(input); wrap.appendChild(out);
      qOptions.appendChild(wrap);
      return;
    }

    // back visibility
    if (backBtn) backBtn.style.visibility = index > 0 ? "visible" : "hidden";
  }

  // ---- Scoring & finish ----
  function finish() {
    const scores = Object.fromEntries(ARCHETYPES.map(a => [a, 0]));

    for (const q of questions) {
      const a = answers[q.id];
      if (!a || !q.archetype || !(q.archetype in scores)) continue;
      const w = Number(q.weight || 1);

      if (q.type === "likert_scale") {
        const opts = q.response_options || [];
        const L = Math.max(1, opts.length - 1);
        const idx = Number.isInteger(a.idx) ? a.idx : Math.floor(L/2);
        const norm = (L - idx) / L; // leftmost = 1
        scores[q.archetype] += norm * w;

      } else if (q.type === "numeric_scale") {
        const min = Number.isFinite(q.min) ? q.min : 1;
        const max = Number.isFinite(q.max) ? q.max : 10;
        const val = Math.min(max, Math.max(min, Number(a.value)));
        const norm = (val - min) / (max - min);
        scores[q.archetype] += norm * w;
      }
      // multiple_choice: neutral unless you add per-option mapping
    }

    const ranked = Object.entries(scores).sort((a,b)=>b[1]-a[1]);
    const primary = ranked[0]?.[0] || null;
    const secondary = ranked[1]?.[0] || null;

    const maxVal = Math.max(1, ...Object.values(scores));
    const normalized = Object.fromEntries(
      Object.entries(scores).map(([k,v]) => [k, Math.round((v/maxVal)*10)])
    );

    sessionStorage.setItem("quizResults", JSON.stringify([primary, secondary]));
    sessionStorage.setItem("archetypeScores", JSON.stringify(normalized));
    window.location.href = "results.html";
  }

  // ---- Wire-up ----
  if (startBtn) {
    startBtn.addEventListener("click", async () => {
      console.log("[quiz] Start clicked");
      if (intro) intro.classList.add("hidden");
      if (quiz)  quiz.classList.remove("hidden");
      await loadAll();
      render();
    });
  } else {
    console.error("[quiz] Start button not found in DOM");
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (index > 0) { index--; render(); }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const q = questions[index];
      if (!isAnswered(q, answers[q?.id])) return;
      if (index < total - 1) { index++; render(); } else { finish(); }
    });
  }
})();
