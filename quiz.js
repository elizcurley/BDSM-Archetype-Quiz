(() => {
  if (window.__quizEngineLoaded) return;
  window.__quizEngineLoaded = true;

  /* =================== Config =================== */

  // Source files (unchanged paths)
  const FILES = [
  "data/foundational_assessment.json",
  "data/hobby_preferences.json",
  "data/kink_general.json",
  "data/kink_specific.json",
  "data/preference_strength.json",
  "data/reflection.json",
  "data/situational.json",
  "data/kink_interests.json",
  "data/psychoemotional.json",
  "data/intimacy_interests.json",
  "data/power_dynamics_general.json",
];


  const ARCHETYPES = ["Catalyst","Explorer","Keystone","Vanguard","Oracle","Connoisseur","Alchemist"];

  // Caps per section by mode
  const MODE_CAPS = {
    deep: {
      foundational_assessment: 10,
      hobby_preferences: 14,
      kink_general: 12,
      kink_specific: 12,
      kink_interests: 12,
      psychoemotional: 12,
      situational: 6,
      reflection: 6,
      preference_strength: 4
    },
    quick: {
      foundational_assessment: 6,
      hobby_preferences: 8,
      kink_general: 6,
      kink_specific: 6,
      kink_interests: 0,        // off in Quick by default
      psychoemotional: 8,
      situational: 4,
      reflection: 4,
      preference_strength: 4
    }
  };

  /* =================== DOM =================== */

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

  /* =================== State =================== */

  let questions = [];        // [{...q, __section}]
  let index = 0;
  let answers = {};          // { [id]: { idx?, value?, label? } }
  let total = 0;

  /* =================== Helpers =================== */

  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function isAnswered(q, a) {
    if (!q) return false;
    if (q.type === "likert_scale" || q.type === "multiple_choice" || q.type === "single") return Number.isInteger(a?.idx);
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
      { set:["very likely","likely","neutral","unlikely","very unlikely"], label:"Likely ← → Unlikely" },
      { set:["very unlikely","unlikely","neutral","likely","very likely"], label:"Unlikely ← → Likely" },
      { set:["extremely important","very important","moderately important","slightly important","not important"], label:"Important ← → Not important" },
      { set:["not important","slightly important","moderately important","very important","extremely important"], label:"Not important ← → Important" },
      { set:["always","often","sometimes","rarely","never"], label:"Always ← → Never" },
      { set:["never","rarely","sometimes","often","always"], label:"Never ← → Always" },
      { set:["very comfortable","comfortable","neutral","uncomfortable","very uncomfortable"], label:"Comfortable ← → Uncomfortable" },
      { set:["very uncomfortable","uncomfortable","neutral","comfortable","very comfortable"], label:"Uncomfortable ← → Comfortable" }
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

  function getPrefs(){
    let mode = "deep", includeKI = true;
    try {
      mode = JSON.parse(sessionStorage.getItem("quizMode") || '"deep"');
      includeKI = JSON.parse(sessionStorage.getItem("includeKinkInterests") || "true");
    } catch {}
    return { mode, includeKI };
  }

  // round-robin pick to preserve archetype coverage
  function pickMaxBalanced(items, max, key="archetype"){
    if (!max || items.length <= max) return items.slice();
    const buckets = new Map();
    for (const it of items) {
      const k = (it && it[key]) || "_none";
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(it);
    }
    for (const b of buckets.values()) shuffle(b);
    const out = [];
    const keys = Array.from(buckets.keys());
    let i = 0;
    while (out.length < max && keys.length) {
      const k = keys[i % keys.length];
      const b = buckets.get(k);
      if (b && b.length) out.push(b.shift());
      for (let j = keys.length - 1; j >= 0; j--) if (!buckets.get(keys[j])?.length) keys.splice(j,1);
      i++;
    }
    return out;
  }

  function safeGetJSON(key, fallback){
    try { return JSON.parse(sessionStorage.getItem(key) || ""); } catch { return fallback; }
  }
  function saveResponse(section, qid, storedValue){
    const all = safeGetJSON("quizResponses", {}) || {};
    all[section] = all[section] || {};
    all[section][qid] = storedValue;
    try { sessionStorage.setItem("quizResponses", JSON.stringify(all)); } catch {}
  }

  /* ============ Load questions (filter, dedupe, cap) ============ */

  async function loadAll() {
    const { mode, includeKI } = getPrefs();
    const CAPS = { ...MODE_CAPS[mode] };
    if (!includeKI) CAPS.kink_interests = 0;

    const fetched = await Promise.all(
      FILES.map(async (file) => {
        const json = await fetch(file).then(r => r.json()).catch(() => ({ questions: [] }));
        const section = file.split("/").pop().replace(".json", "");
        const list = Array.isArray(json.questions) ? json.questions : [];
        return { section, questions: list };
      })
    );

    // 1) Build pool (supports likert_scale, numeric_scale, multiple_choice, single)
    let pool = fetched.flatMap(({ section, questions }) =>
      questions
        .filter(q => ["likert_scale","numeric_scale","multiple_choice","single"].includes(q?.type))
        .map(q => ({ ...q, __section: section }))
    );

    // 2) Drop safety/identify items (static)
    const DROP_IDS = new Set(["identify_archetype","know_archetype","self_identify_archetype"]);
    const DROP_TEXT_PATTERNS = [
      /\bssc\b|\brack\b|\bsafe[- ]?word\b|\bconsent\b|\baftercare\b|\bnegotiation\b|\binjury\b|\bemergency\b|\bprotocol\b|\bsafety\b/i,
      /\bidentify\b.*\barchetype\b/i,
      /\barchetype\b.*\bidentify\b/i,
      /\bprimary archetype\b/i,
      /\bstrongly identify\b.*\barchetype\b/i
    ];
    pool = pool.filter(q => {
      const id   = String(q.id || "").toLowerCase();
      const text = String(q.question_text || q.text || "");
      if (DROP_IDS.has(id)) return false;
      if (DROP_TEXT_PATTERNS.some(re => re.test(text))) return false;
      return true;
    });

    // 3) Dedupe by id
    const seen = new Set();
    pool = pool.filter(q => {
      const id = String(q.id || "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // 4) Group by section → cap with archetype balance
    const groups = {};
    for (const q of pool) (groups[q.__section] ||= []).push(q);

    const picked = [];
    for (const [sec, arr] of Object.entries(groups)) {
      const cap = CAPS[sec] ?? arr.length;
      const group = shuffle(arr.slice());
      picked.push(...pickMaxBalanced(group, cap, "archetype"));
    }

    // 5) Final shuffle + totals
    questions = shuffle(picked);
    total = questions.length;

    // Debug counts
    const bySection = {}; const byArch = {};
    for (const q of questions) {
      bySection[q.__section] = (bySection[q.__section] || 0) + 1;
      if (q.archetype) byArch[q.archetype] = (byArch[q.archetype] || 0) + 1;
    }
    console.log("Mode:", mode, "Caps:", CAPS);
    console.log("Question counts by section:", bySection);
    console.log("Question counts by archetype:", byArch);
    console.log("Total questions:", total);
  }

  /* =================== Render =================== */

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

    // normalize options for each type
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
          answers[q.id] = { idx:i, value:i, label:opt };
          // store string label for dynamic rules
          saveResponse(q.__section, q.id, opt);
          if (navigator.vibrate) navigator.vibrate(15);
          bindNavForCurrent();
          render();
        });
        qOptions.appendChild(btn);
      });

    } else if (q.type === "multiple_choice" || q.type === "single") {
      // Support both schemas: response_options[] OR choices[{label,value}]
      const choices = Array.isArray(q.response_options) && q.response_options.length
        ? q.response_options.map((s,idx) => ({ label:String(s), value:String(s), _idx:idx }))
        : (Array.isArray(q.choices) ? q.choices.map((c,idx) => ({
            label: c.label ?? String(c.value ?? `Option ${idx+1}`),
            value: c.value ?? c.label ?? `opt_${idx}`,
            _idx: idx
          })) : []);

      choices.forEach((opt) => {
        const btn = document.createElement("button");
        const active = answers[q.id]?.idx === opt._idx;
        btn.className = "option" + (active ? " active" : "");
        btn.textContent = opt.label;
        btn.setAttribute("aria-pressed", active ? "true" : "false");
        btn.addEventListener("click", () => {
          answers[q.id] = { idx: opt._idx, value: opt.value, label: opt.label };
          // store VALUE if present; fall back to label
          saveResponse(q.__section, q.id, opt.value ?? opt.label);
          if (navigator.vibrate) navigator.vibrate(15);
          bindNavForCurrent();
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
        const val = Number(input.value);
        answers[q.id] = { value: val };
        out.textContent = String(val);
        saveResponse(q.__section, q.id, val); // store number
        bindNavForCurrent();
      });
      wrap.appendChild(input); wrap.appendChild(out);
      qOptions.appendChild(wrap);
      return;
    }

    // back visibility
    if (backBtn) backBtn.style.visibility = index > 0 ? "visible" : "hidden";
  }

  /* =================== Scoring & finish =================== */

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

      } else if (q.type === "multiple_choice" || q.type === "single") {
        // If your MC/single items have per-choice weights, you can extend this.
        // For now we treat item-level archetype weighting only (same as before).
        scores[q.archetype] += (1 * w);
      }
    }

    // rank + normalize to 0..10 for radar
    const ranked = Object.entries(scores).sort((a,b)=>b[1]-a[1]);
    const primary = ranked[0]?.[0] || null;
    const secondary = ranked[1]?.[0] || null;

    const maxVal = Math.max(1, ...Object.values(scores));
    const normalized = Object.fromEntries(
      Object.entries(scores).map(([k,v]) => [k, Math.round((v/maxVal)*10)])
    );
    
    // Build a sectioned answer map for dynamic rules
const bySection = {};
for (const q of questions) {
  const a = answers[q.id];
  if (!a) continue;
  const sec = q.__section || "misc";

  // Normalize what we store so rules are easy to write:
  // - likert_scale: store the option text (e.g., "Somewhat agree")
  // - numeric_scale: store the number (e.g., 7)
  // - multiple_choice: store the chosen label string
  let stored = null;
  if (q.type === "likert_scale") {
    stored = (q.response_options || [])[a.idx] ?? null;
  } else if (q.type === "numeric_scale") {
    stored = Number(a.value);
  } else if (q.type === "multiple_choice") {
    stored = (q.response_options || [])[a.idx] ?? null;
  }

  if (!(sec in bySection)) bySection[sec] = {};
  bySection[sec][q.id] = stored;
}

// Persist alongside your other items
sessionStorage.setItem("quizResponses", JSON.stringify(bySection));


    try {
      sessionStorage.setItem("quizResults", JSON.stringify([primary, secondary]));
      sessionStorage.setItem("archetypeScores", JSON.stringify(normalized));
      // quizResponses already saved incrementally
    } catch {}

    window.location.href = "results.html";
  }

  /* =================== Wire-up =================== */

  if (startBtn) {
    startBtn.addEventListener("click", async () => {
      if (intro) intro.classList.add("hidden");
      if (quiz)  quiz.classList.remove("hidden");
      await loadAll();
      render();
    });
  } else {
    console.error("[quiz] Start button not found in DOM");
  }

  backBtn?.addEventListener("click", () => {
    if (index > 0) { index--; render(); }
  });

  nextBtn?.addEventListener("click", () => {
    const q = questions[index];
    if (!isAnswered(q, answers[q?.id])) return;
    if (index < total - 1) { index++; render(); } else { finish(); }
  });
})();
