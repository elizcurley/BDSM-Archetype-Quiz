/* results.js — primary/secondary, images, narratives, radar, pref-strength multipliers, tag recs, dynamic narrative */

document.addEventListener("DOMContentLoaded", initResults);

async function initResults() {
  // 1) Grab all the elements we’ll fill
  const els = {
    primary:      byId("primary-archetype"),
    secondary:    byId("secondary-archetype"),
    desc:         byId("archetype-description"),
    affirm:       byId("affirming-message"),
    insights:     byId("personalized-insights"),
    reflList:     byId("reflection-list"),
    primaryImg:   byId("primary-image"),
    secondaryImg: byId("secondary-image"),
    radar:        byId("spider-graph"),
    fitWrap:      byId("fit-check"),
    pdfBtn:       byId("export-pdf"),
    recsWrap:     byId("top-interests") // optional container for “Top Interests”
  };

  // 2) Constants (names + image paths)
  const ARCHETYPES = ["Alchemist","Catalyst","Connoisseur","Explorer","Keystone","Oracle","Vanguard"];
  const IMG_MAP = {
    Catalyst: "images/archetypes/Catalyst.png",
    Explorer: "images/archetypes/Explorer.png",
    Keystone: "images/archetypes/Keystone.png",
    Vanguard: "images/archetypes/Vanguard.png",
    Oracle: "images/archetypes/Oracle.png",
    Connoisseur:"images/archetypes/Connoisseur.png",
    Alchemist: "images/archetypes/Alchemist.png"
  };

  // 3) Pull stored results from sessionStorage
  const [savedPrimary, savedSecondary] = safeJSON(sessionStorage.getItem("quizResults"), []) || [];
  const rawScores   = safeJSON(sessionStorage.getItem("archetypeScores"), {}) || {};
  const allResponses = safeJSON(sessionStorage.getItem("quizResponses"), {}) || {};

  // 4) Apply Preference Strength multipliers (gentle tilt)
  let adjustedScores = { ...rawScores };
  try {
    const psResponses = allResponses.preference_strength; // may be undefined
    if (psResponses) {
      const psItems = await fetch("quiz_sections/preference_strength.json").then(r => r.json());
      const multipliers = computePrefMultipliers(psItems, psResponses, { minM: 0.90, maxM: 1.20 });
      adjustedScores = applyMultipliers(rawScores, multipliers);
    }
  } catch (e) {
    console.warn("Preference Strength: skipped due to error", e);
  }

  // 5) Decide primary/secondary (use stored ones, else derive from scores)
  let primary   = savedPrimary;
  let secondary = savedSecondary;
  if (!primary || !secondary) {
    const [p, s] = topTwoFromScores(adjustedScores, ARCHETYPES);
    primary   = primary   || p || "—";
    secondary = secondary || s || "—";
  }

  // 6) Render names + images
  setText(els.primary, primary || "—");
  setText(els.secondary, secondary || "—");
  setArchetypeImage(els.primaryImg, primary, IMG_MAP);
  setArchetypeImage(els.secondaryImg, secondary, IMG_MAP);

  // 7) Load narratives for the chosen primary from quiz_data.json
  try {
    const data = await fetch("quiz_data.json").then(r => r.json());
    const details = (data.archetypes || {})[primary] || {};
    setText(els.desc,   details.description || "—");
    setText(els.affirm, details.affirmation || "—");
    if (els.insights) {
      setText(
        els.insights,
        Array.isArray(details.insights) ? details.insights.join(" ") : (details.insights || "—")
      );
    }
    if (els.reflList) {
      els.reflList.innerHTML = "";
      (details.reflection || []).forEach(q => {
        const li = document.createElement("li");
        li.textContent = q;
        els.reflList.appendChild(li);
      });
    }
  } catch (e) {
    console.warn("quiz_data.json load issue:", e);
  }

  // 8) Radar chart using adjustedScores
  if (els.radar && typeof Chart !== "undefined") {
    let labels = Object.keys(adjustedScores);
    let dataVals = labels.map(k => Number(adjustedScores[k] ?? 0));

    if (!labels.length) {
      labels = ARCHETYPES.slice();
      dataVals = labels.map(() => 0);
    }
    const maxVal = Math.max(10, ...dataVals, 0);

    new Chart(els.radar.getContext("2d"), {
      type: "radar",
      data: {
        labels,
        datasets: [{
          label: "Archetype Balance",
          data: dataVals,
          backgroundColor: "rgba(90,103,216,0.18)",
          borderColor: "#5a67d8",
          borderWidth: 2,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        scales: { r: { suggestedMin: 0, suggestedMax: niceCeil(maxVal), ticks: { stepSize: Math.max(2, Math.round(maxVal/5)) } } },
        plugins: { legend: { display: false } }
      }
    });
  }

  // 9) (Optional) Fit-check slider
  if (els.fitWrap) {
    els.fitWrap.innerHTML = `
      <label for="fitRange">How much does this result fit you right now?</label>
      <div style="margin:8px 0">
        <input id="fitRange" type="range" min="1" max="7" step="1" value="4">
        <output id="fitOut" style="margin-left:8px">4</output>/7
      </div>`;
    const range = byId("fitRange");
    const out   = byId("fitOut");
    range?.addEventListener("input", () => { out.textContent = range.value; });
  }

  // 10) (Optional) Tag-based interests → show top tags if you saved them
  //     IMPORTANT: declare topTags in outer scope so you can reuse it below.
  let topTags = [];
  try {
    const kiResponses = allResponses.kink_interests;
    if (kiResponses && els.recsWrap) {
      const kiItems = await fetch("quiz_sections/kink_interests.json").then(r => r.json());
      topTags = scoreTags(kiItems, kiResponses).slice(0, 7); // [ [tag,score], ... ]
      renderTopTagCard(els.recsWrap, topTags, primary);
    }
  } catch (e) {
    console.warn("Tag scoring skipped:", e);
  }

  // 10.5) Build dynamic narrative (needs allResponses + topTags)
  try {
    const dyn = await buildDynamicNarrative(allResponses, topTags || [], primary);
    fillList("dyn-insights", dyn.insights);
    fillList("dyn-affirm",  dyn.affirmations);
    fillList("dyn-explore", dyn.explore);
    fillList("dyn-growth",  dyn.growth);
  } catch (e) {
    console.warn("Dynamic narrative skipped:", e);
  }

  // after dynamic narrative section
try {
  const kink = await buildKinkRecs(topTags, primary);
  if (kink) {
    fillList("kink-scenes", kink.scenes.map(s =>
      `${s.title}: ${s.ideas[0] || "—"}${s.stretch?.length ? ` (stretch: ${s.stretch[0]})` : ""}`
    ));
    fillList("kink-props",  kink.props);
    fillList("kink-comms",  kink.comms);
    fillList("kink-care",   kink.care);
  }
} catch(e){ console.warn("Kink recs skipped:", e); }


  // 11) PDF export button
  if (els.pdfBtn && typeof html2pdf !== "undefined") {
    els.pdfBtn.addEventListener("click", () => {
      const source = document.querySelector("#results-root") || document.body;
      const opt = {
        margin: [0.5,0.5,0.5,0.5],
        filename: `quiz-results-${Date.now()}.pdf`,
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
      };
      html2pdf().from(source).set(opt).save();
    });
  }
}

/* ================ Helpers and small scoring utils ================ */

function byId(id){ return document.getElementById(id); }
function setText(el, txt){ if(el) el.textContent = txt; }
function niceCeil(n){ const S=[10,12,15,20,25,30,40,50,60,75,100]; for(const x of S) if(n<=x) return x; return Math.ceil(n); }

function setArchetypeImage(imgEl, name, map){
  if(!imgEl || !name) return;
  const src = map[name];
  if(!src){ imgEl.style.display="none"; return; }
  imgEl.src = src;
  imgEl.alt = `${name} archetype icon`;
  imgEl.loading = "lazy";
  imgEl.onerror = () => { imgEl.style.display="none"; };
}

function safeJSON(str, fallback){
  try { return JSON.parse(str ?? ""); } catch { return fallback; }
}

function topTwoFromScores(scores, orderFallback){
  const entries = Object.entries(scores).filter(([,v]) => typeof v === "number");
  if(!entries.length) return [orderFallback?.[0] || null, orderFallback?.[1] || null];
  entries.sort((a,b) => b[1]-a[1]);
  const [p,s] = entries;
  return [p?.[0] || null, s?.[0] || null];
}

/* ---- Preference Strength multipliers ---- */
function computePrefMultipliers(psItemsJson, psResponses, {minM=0.90, maxM=1.20} = {}){
  const ARCHETYPES = ["Alchemist","Catalyst","Connoisseur","Explorer","Keystone","Oracle","Vanguard"];
  const sums   = Object.fromEntries(ARCHETYPES.map(a => [a, 0]));
  const counts = Object.fromEntries(ARCHETYPES.map(a => [a, 0]));
  const items  = (psItemsJson?.questions) || [];

  for(const q of items){
    const a = q.archetype;
    const ans = psResponses?.[q.id];
    if(ans == null) continue;

    let norm = null;
    if(q.type === "numeric_scale" && typeof ans === "number" && q.max > q.min){
      norm = (ans - q.min) / (q.max - q.min);
    } else if(q.type === "likert_scale" && Array.isArray(q.response_options)){
      if (typeof ans === "number"){
        norm = (ans - 1) / (q.response_options.length - 1);
      } else if (typeof ans === "string"){
        const idx = q.response_options.indexOf(ans);
        if (idx >= 0) norm = idx / (q.response_options.length - 1);
      }
    }
    if(norm == null) continue;

    sums[a]   += Math.max(0, Math.min(1, norm));
    counts[a] += 1;
  }

  const multipliers = {};
  for(const a of Object.keys(sums)){
    const s = counts[a] ? (sums[a] / counts[a]) : 0.5; // neutral if no answers
    multipliers[a] = minM + (maxM - minM) * s;
  }
  return multipliers; // e.g. { Connoisseur: 1.12, Explorer: 0.97, ... }
}

function applyMultipliers(scores, multipliers){
  const out = {};
  for(const k of Object.keys(scores)){
    const m = multipliers?.[k] ?? 1;
    out[k] = (scores[k] ?? 0) * m;
  }
  return out;
}

/* ---- Tag scoring (optional) ---- */
function scoreTags(kinkInterestsItems, responses){
  const hits = {}, opps = {};
  for(const item of kinkInterestsItems){
    const itemTags = new Set();
    for(const c of item.choices) (c.tags || []).forEach(t => itemTags.add(t));
    itemTags.forEach(t => opps[t] = (opps[t] || 0) + 1);

    const picked = new Set(responses[item.id] || []);
    for(const c of item.choices){
      if(picked.has(c.value)) (c.tags || []).forEach(t => hits[t] = (hits[t] || 0) + 1);
    }
  }
  const scores = Object.fromEntries(Object.keys(opps).map(t => [t, (hits[t] || 0) / opps[t]]));
  return Object.entries(scores).sort((a,b) => b[1]-a[1]); // [tag,score] desc
}

function renderTopTagCard(container, topTags, primaryArchetype){
  if(!container) return;
  const mk = ([tag, sc]) => `<li><strong>${tag}</strong> — ${(sc*100|0)}%</li>`;
  container.innerHTML = `
    <h3 class="mt-6">Top Interests</h3>
    <p class="muted">These hint at scenes, materials, and vibes you might enjoy.</p>
    <ul class="tag-list">
      ${topTags.map(mk).join("")}
    </ul>
    <p class="muted">Tuned slightly toward your primary archetype: <em>${primaryArchetype || "—"}</em>.</p>
  `;
}

/* ---- Dynamic narrative helpers (NEW) ---- */
async function buildDynamicNarrative(allResponses, topTags, primary) {
  // Load rulebook (optional file; function safely falls back)
  let rules;
  try {
    rules = await fetch("quiz_dynamic_rules.json").then(r => r.json());
  } catch {
    return { affirmations: [], insights: [], explore: [], growth: [] };
  }

  const acc = { affirmations: [], insights: [], explore: [], growth: [] };

  // 1) Item-based rules
  for (const rule of (rules.rules || [])) {
    const cond = rule.if || {};
    const section = cond.section;
    const id = cond.id;
    if (!section || !id) continue;

    const sec = allResponses[section] || {};
    const ans = sec[id];
    if (ans == null) continue;

    let match = false;
    // match specific choice(s)
    if (Array.isArray(cond.choice_in)) {
      const picked = Array.isArray(ans) ? ans : [ans];
      match = picked.some(v => cond.choice_in.includes(v));
    }
    // match likert threshold
    if (!match && cond.likert_at_least) {
      const scale = ["Strongly disagree","Somewhat disagree","Neutral","Somewhat agree","Strongly agree"];
      const idxAns = scale.indexOf(ans);
      const idxMin = scale.indexOf(cond.likert_at_least);
      if (idxAns >= 0 && idxMin >= 0) match = idxAns >= idxMin;
    }

    if (match) mergeBuckets(acc, rule.then || {});
  }

  // 2) Tag-based rules
  const tagSet = new Set((topTags || []).map(([t]) => t));
  for (const tr of (rules.tag_rules || [])) {
    const any = (tr.if_any_tags || []).some(t => tagSet.has(t));
    if (any) mergeBuckets(acc, tr.then || {});
  }

  // 3) Light archetype seasoning
  if (primary) acc.affirmations.push(`Your ${primary} core shows up in the little things—trust that pattern.`);

  // Dedup + trim
  for (const k of Object.keys(acc)) {
    acc[k] = Array.from(new Set(acc[k])).slice(0, k === "insights" ? 6 : 4);
  }
  return acc;
}

function mergeBuckets(acc, add) {
  for (const k of ["affirmations","insights","explore","growth"]) {
    if (add[k]) acc[k].push(...[].concat(add[k]));
  }
}

function fillList(id, items){
  const ul = document.getElementById(id);
  if (!ul) return;
  ul.innerHTML = (items || []).map(t => `<li>${t}</li>`).join("");
}
