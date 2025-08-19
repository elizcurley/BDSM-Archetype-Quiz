
(() => {
  if (window.__quizEngineLoaded) return;
  window.__quizEngineLoaded = true;

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

  const intro = document.getElementById("intro");
  const quiz  = document.getElementById("quiz");
  const startBtn = document.getElementById("start");
  const backBtn  = document.getElementById("back");
  const nextBtn  = document.getElementById("next");
  const qText    = document.getElementById("q-text");
  const qOptions = document.getElementById("q-options");
  const pText    = document.getElementById("progress-text");
  const pFill    = document.getElementById("progress-fill");

  let questions = [];
  let index = 0;
  let answers = {}; // id -> { idx, value }
  let total = 0;

  startBtn.addEventListener("click", async () => {
    intro.classList.add("hidden");
    quiz.classList.remove("hidden");
    await loadAll();
    render();
  });

    // Helpers — Likert left↔right legend for common scales
  function likertLegend(opts = []) {
    const norm = opts.map(s => String(s).trim().toLowerCase());
    const joined = norm.join("|");

    const patterns = [
      { set: ["strongly agree","somewhat agree","neutral","somewhat disagree","strongly disagree"], label: "Agree ← → Disagree" },
      { set: ["strongly disagree","somewhat disagree","neutral","somewhat agree","strongly agree"], label: "Disagree ← → Agree" },
      { set: ["extremely likely","very likely","neutral","unlikely","very unlikely"], label: "Likely ← → Unlikely" },
      { set: ["very likely","likely","neutral","unlikely","very unlikely"], label: "Likely ← → Unlikely" },
      { set: ["very unlikely","unlikely","neutral","likely","very likely"], label: "Unlikely ← → Likely" },
      { set: ["extremely unlikely","very unlikely","neutral","likely","very likely"], label: "Unlikely ← → Likely" },
      { set: ["extremely important","very important","moderately important","slightly important","not important"], label: "Important ← → Not important" },
      { set: ["not important","slightly important","moderately important","very important","extremely important"], label: "Not important ← → Important" },
      { set: ["always","often","sometimes","rarely","never"], label: "Always ← → Never" },
      { set: ["never","rarely","sometimes","often","always"], label: "Never ← → Always" },
      { set: ["very comfortable","comfortable","neutral","uncomfortable","very uncomfortable"], label: "Comfortable ← → Uncomfortable" },
      { set: ["very uncomfortable","uncomfortable","neutral","comfortable","very comfortable"], label: "Uncomfortable ← → Comfortable" },
    ];

    for (const p of patterns) {
      if (joined === p.set.join("|")) return p.label;
    }

    // Heuristic fallback for near-match wordings
    const first = norm[0] || "", last = norm[norm.length - 1] || "";
    if (first.includes("likely") && (last.includes("unlikely") || last.includes("not"))) return "Likely ← → Unlikely";
    if ((first.includes("unlikely") || first.includes("not")) && last.includes("likely")) return "Unlikely ← → Likely";
    if (first.includes("important") && last.includes("not")) return "Important ← → Not important";
    if (first.includes("not") && last.includes("important")) return "Not important ← → Important";
    if (first.includes("always") && last.includes("never")) return "Always ← → Never";
    if (first.includes("never") && last.includes("always")) return "Never ← → Always";
    if (first.includes("comfortable") && last.includes("uncomfortable")) return "Comfortable ← → Uncomfortable";
    if (first.includes("uncomfortable") && last.includes("comfortable")) return "Uncomfortable ← → Comfortable";

    return null;
  }


  backBtn.addEventListener("click", () => {
    if (index > 0) { index--; render(); }
  });

  nextBtn.addEventListener("click", () => {
    if (index < total-1) { index++; render(); }
    else { finish(); }
  });

  async function loadAll() {
    const results = await Promise.all(FILES.map(f => fetch(f).then(r=>r.json()).catch(()=>({questions:[]}))));
    questions = results.flatMap(j => (j.questions||[]))
                       .filter(q => ["likert_scale","numeric_scale","multiple_choice"].includes(q.type));
    // Deduplicate by id in case of overlaps
    const seen = new Set();
    questions = questions.filter(q => {
      if (!q.id || seen.has(q.id)) return false;
      seen.add(q.id); return true;
    });
    total = questions.length;
  }

  function render() {
    const q = questions[index];
    if (!q) return;

    // progress
    pText.textContent = `Question ${index+1} of ${total}`;
    pFill.style.width = `${Math.round(((index+1)/Math.max(1,total))*100)}%`;

    // text
    qText.textContent = q.question_text || q.text || "Question";

    // options
    qOptions.innerHTML = "";

   if (q.type === "likert_scale") {
  const rawOpts = q.response_options || [];
  const legendText = likertLegend(rawOpts);

  if (legendText) {
    const legend = document.createElement("div");
    legend.className = "likert-legend";
    legend.textContent = legendText;
    qOptions.appendChild(legend);
  }

  rawOpts.forEach((opt, i) => {
    const btn = document.createElement("button");
    const isActive = answers[q.id]?.idx === i;
    btn.className = "option" + (isActive ? " active" : "");
    btn.textContent = opt;
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    btn.addEventListener("click", () => {
      answers[q.id] = { idx: i, value: i };
      if (navigator.vibrate) navigator.vibrate(15); // optional haptic
      render();
    });
    qOptions.appendChild(btn);
  });
}

else if (q.type === "multiple_choice") {
  (q.response_options || []).forEach((opt, i) => {
    const btn = document.createElement("button");
    const isActive = answers[q.id]?.idx === i;
    btn.className = "option" + (isActive ? " active" : "");
    btn.textContent = opt;
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    btn.addEventListener("click", () => {
      answers[q.id] = { idx: i, value: i };
      if (navigator.vibrate) navigator.vibrate(15);
      render();
    });
    qOptions.appendChild(btn);
  });
}
 else if (q.type === "numeric_scale") {
      const min = Number.isFinite(q.min) ? q.min : 1;
      const max = Number.isFinite(q.max) ? q.max : 10;
      const wrap = document.createElement("div");
      const input = document.createElement("input");
      input.type = "range"; input.min = min; input.max = max; input.step = 1;
      input.value = answers[q.id]?.value ?? Math.round((min+max)/2);
      const out = document.createElement("div");
      out.textContent = String(input.value);
      out.style.marginTop = "6px";
      input.addEventListener("input", () => { out.textContent = String(input.value); });
      wrap.appendChild(input); wrap.appendChild(out);
      qOptions.appendChild(wrap);
      nextBtn.onclick = () => {
        answers[q.id] = { value: Number(input.value) };
        if (index < total-1) { index++; render(); } else { finish(); }
      };
      return;
    }

    // default next handler
    nextBtn.onclick = () => {
      if (index < total-1) { index++; render(); } else { finish(); }
    };

    // back visibility
    backBtn.style.visibility = index > 0 ? "visible" : "hidden";
  }

  // Compute scores with heuristic orientation:
  // - Likert with recognizable positive->negative sequences: map left=1, right=0
  // - Numeric scale: normalize min..max (higher assumed more of the tagged archetype)
  // - Multiple choice: no scoring unless configured (treated neutral for now)
  function finish() {
    const scores = Object.fromEntries(ARCHETYPES.map(a => [a, 0]));
    const weights = {}; // per-question weight cache

    const POSITIVE_SETS = [
      // Standard strongly agree -> strongly disagree
      ["Strongly agree","Somewhat agree","Neutral","Somewhat disagree","Strongly disagree"],
      // Importance
      ["Extremely important","Very important","Moderately important","Slightly important","Not important"],
      // Frequency
      ["Always","Often","Sometimes","Rarely","Never"],
      // Likelihood
      ["Very likely","Likely","Neutral","Unlikely","Very unlikely"],
      // Comfort
      ["Very comfortable","Comfortable","Neutral","Uncomfortable","Very uncomfortable"],
      // Trust/priority variants
      ["Always trust my intuition","Often trust my intuition","Neutral","Rarely trust my intuition","Never trust my intuition"],
      ["Safety protocols always come first","Safety protocols are very important","Balance safety with creativity","Prefer spontaneity over strict protocols","Spontaneity always comes first"],
    ].map(a => a.join("|"));

    function looksPositiveLeft(opts) {
      const key = (opts||[]).join("|");
      return POSITIVE_SETS.some(p => key.startswith(p));
    }

    for (const q of questions) {
      const a = answers[q.id];
      const arche = q.archetype;
      const w = Number(q.weight || 1);
      if (!arche || !(arche in scores) || !a) continue;

      if (q.type === "likert_scale") {
        const opts = q.response_options || [];
        let norm = 0.5; // neutral default
        if (looksPositiveLeft(opts) && Number.isInteger(a.idx)) {
          const L = Math.max(1, opts.length - 1);
          norm = (L - a.idx) / L; // leftmost -> 1
        }
        scores[arche] += norm * w;

      } else if (q.type === "numeric_scale") {
        const min = Number.isFinite(q.min) ? q.min : 1;
        const max = Number.isFinite(q.max) ? q.max : 10;
        const v = Math.min(max, Math.max(min, Number(a.value)));
        const norm = (v - min) / (max - min);
        scores[arche] += norm * w;

      } else if (q.type === "multiple_choice") {
        // For now, treat as neutral until we define per-option alignment
        // (We can add an external overrides map in a later pass.)
        continue;
      }
    }

    // Rank + normalize for chart
    const ranked = Object.entries(scores).sort((a,b)=>b[1]-a[1]);
    const primary = ranked[0]?.[0] || null;
    const secondary = ranked[1]?.[0] || null;
    const maxVal = Math.max(1, ...Object.values(scores));
    const normalized = Object.fromEntries(Object.entries(scores).map(([k,v]) => [k, Math.round( (v/maxVal)*10 )]));

    // Persist for results page
    sessionStorage.setItem("quizResults", JSON.stringify([primary, secondary]));
    sessionStorage.setItem("archetypeScores", JSON.stringify(normalized));

    // Navigate
    window.location.href = "results.html";
  }
})();
