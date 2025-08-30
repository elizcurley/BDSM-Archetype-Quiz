/* results.js — primary/secondary, images, narratives, radar, pref-strength multipliers,
   tag recs, dynamic narrative, why-chips, kink toggle (with robust fetch fallbacks) */

const DATA_BASE = "data/"; // set to "../data/" if results.html is in a subfolder

document.addEventListener("DOMContentLoaded", initResults);

/* ---------- Fetch helpers (robust) ---------- */
async function loadJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} → ${res.status} ${res.statusText}`);
  return res.json();
}
async function loadFirstJSON(urls, fallbackElId = null) {
  for (const u of urls) {
    try { return await loadJSON(u); }
    catch (e) { console.warn("Missing/blocked:", u); }
  }
  if (fallbackElId) {
    const el = document.getElementById(fallbackElId);
    if (el?.textContent) return JSON.parse(el.textContent);
  }
  throw new Error("All JSON sources missing");
}

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
    recsWrap:     byId("top-interests")
  };

  // 2) Constants (names + image paths)
  const ARCHETYPES = ["Alchemist","Catalyst","Connoisseur","Explorer","Keystone","Oracle","Vanguard"];
  const IMG_MAP = {
    Catalyst:    "images/archetypes/Catalyst.png",
    Explorer:    "images/archetypes/Explorer.png",
    Keystone:    "images/archetypes/Keystone.png",
    Vanguard:    "images/archetypes/Vanguard.png",
    Oracle:      "images/archetypes/Oracle.png",
    Connoisseur: "images/archetypes/Connoisseur.png",
    Alchemist:   "images/archetypes/Alchemist.png"
  };

  // 3) Pull stored results from sessionStorage (array OR object)
  const saved = safeJSON(sessionStorage.getItem("quizResults"), null);
  let savedPrimary = null, savedSecondary = null;
  if (Array.isArray(saved)) {
    [savedPrimary, savedSecondary] = saved;
  } else if (saved && typeof saved === "object") {
    savedPrimary = saved.primary ?? null;
    savedSecondary = saved.secondary ?? null;
  }

  // Scores: allow multiple possible keys
  const rawScores =
    safeJSON(sessionStorage.getItem("archetypeScores"), null) ??
    safeJSON(sessionStorage.getItem("quizScores"), null) ??
    safeJSON(sessionStorage.getItem("scores"), {}) ?? {};

  const allResponses = safeJSON(sessionStorage.getItem("quizResponses"), {}) || {};

  // 4) Apply Preference Strength multipliers (gentle tilt)
  let adjustedScores = { ...rawScores };
  try {
    const psResponses = allResponses.preference_strength; // may be undefined
    if (psResponses) {
      const psItems = await loadFirstJSON([
        `${DATA_BASE}preference_strength.json?v=1`,
        `quiz_sections/preference_strength.json?v=1`
      ]);
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

  // 7) Load narratives (tries /data then root then inline fallback) with field fallbacks
  try {
    const data = await loadFirstJSON(
      [
        `${DATA_BASE}quiz_data.json?v=2`,
        `quiz_data.json?v=2`,
        `./quiz_data.json?v=2`
      ],
      "archetypes-data"
    );

    const arche = (data && (data.archetypes || data)) || {};
    const details = arche[primary] || {};

    const description = pickDescription(details);
    const affirmation = pickAffirmation(details, secondary);
    const insightsTxt = pickInsights(details);
    const reflections = pickReflections(details);

    textOrHide(els.desc, description);
    textOrHide(els.affirm, affirmation);
    textOrHide(els.insights, insightsTxt);

    if (els.reflList) {
      els.reflList.innerHTML = "";
      if (reflections.length) {
        for (let i=0; i<reflections.length; i++){
          const li = document.createElement("li");
          li.textContent = reflections[i];
          els.reflList.appendChild(li);
        }
        showParentSection(els.reflList);
      } else {
        hideParentSection(els.reflList);
      }
    }
  } catch (e) {
    console.warn("quiz_data.json load issue:", e);
  }

  // 8) Radar chart using adjustedScores
  if (els.radar && typeof Chart !== "undefined") {
    let labels = Object.keys(adjustedScores);
    let dataVals = labels.map(k => Number(adjustedScores[k] ?? 0));
    if (!labels.length) { labels = ARCHETYPES.slice(); dataVals = labels.map(() => 0); }
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

  // 10) Tag-based interests → show top tags if you saved them
  let topTags = [];
  try {
    const kiResponses = allResponses.kink_interests;
    if (kiResponses && els.recsWrap) {
      const kiItems = await loadFirstJSON([
        `${DATA_BASE}kink_interests.json?v=1`,
        `quiz_sections/kink_interests.json?v=1`
      ]);
      topTags = scoreTags(kiItems, kiResponses, { primary }).slice(0, 7);
      renderTopTagCard(els.recsWrap, topTags, primary);
    }
  } catch (e) {
    console.warn("Tag scoring skipped:", e);
  }

  // 10.5) Dynamic narrative (needs allResponses + topTags)
  let dyn = { affirmations:[], insights:[], explore:[], growth:[], reasons:[] };
  try {
    dyn = await buildDynamicNarrative(allResponses, topTags || [], primary);
    fillList("dyn-insights", dyn.insights);
    fillList("dyn-affirm",  dyn.affirmations);
    fillList("dyn-explore", dyn.explore);
    fillList("dyn-growth",  dyn.growth);
    renderWhyChips(dyn.reasons, topTags);
  } catch (e) {
    console.warn("Dynamic narrative skipped:", e);
  }

/* ---- Kink translation builder (taxonomy-driven, with bias fallback) ---- */
async function buildKinkRecs(topTags, primary) {
  let tax = {}, map = {};
  try {
    tax = await loadJSON(`${DATA_BASE}kink_taxonomy.json?v=3`);
    map = await loadJSON(`${DATA_BASE}kink_recs_map.json?v=3`);
  } catch {
    return null; // graceful skip if files missing
  }

  // If no user interest tags (e.g., opened results in a fresh tab), seed from archetype bias
  const seeded = (!topTags || !topTags.length)
    ? ((map.archetype_bias && map.archetype_bias[primary]) || []).map(t => [t, 0.6])
    : topTags;

  const bias = new Set((map.archetype_bias && map.archetype_bias[primary]) || []);
  const ranked = (seeded || [])
    .map(([tag, score]) => ({ tag, score: (score || 0) + (bias.has(tag) ? 0.15 : 0) }))
    .sort((a, b) => b.score - a.score);

  const scenes = [];
  const props  = [];
  const comms  = [];
  const care   = [];
  const uniq = arr => Array.from(new Set(arr.map(s => String(s).trim()))).filter(Boolean);

  for (const { tag } of ranked.slice(0, 16)) {
    const m = tax.tags && tax.tags[tag];
    if (!m) continue;
    const cat = m.category || "Misc";

    // Scene ideas from every tag
    scenes.push({
      title: `${cat}: ${tag}`,
      ideas: Array.isArray(m.beginner) ? m.beginner.slice(0, 1) : [],
      stretch: Array.isArray(m.advanced) ? m.advanced.slice(0, 1) : [],
      safety: Array.isArray(m.safety) ? m.safety.slice(0, 1) : []
    });

    // Props from Objects/Materials & Aesthetic/Presentation
    if (cat === "Objects & Materials" || cat === "Aesthetic & Presentation") {
      if (Array.isArray(m.beginner)) props.push(...m.beginner.slice(0, 2));
    }

    // Phrases from Communication & Voice and Ritual & Symbol
    if (cat === "Communication & Voice" || cat === "Ritual & Symbol") {
      if (Array.isArray(m.beginner)) comms.push(...m.beginner.slice(0, 2));
    }

    // Aftercare from Care & Recovery; echo some Impact safety as care
    if (cat === "Care & Recovery") {
      if (Array.isArray(m.beginner)) care.push(...m.beginner.slice(0, 2));
    }
    if (cat === "Impact" && Array.isArray(m.safety)) {
      care.push(...m.safety.slice(0, 1));
    }
  }

  return {
    scenes: scenes.slice(0, 4),
    props:  uniq(props).slice(0, 5),
    comms:  uniq(comms).slice(0, 5),
    care:   uniq(care).slice(0, 5)
  };
}
  const uniq = arr => Array.from(new Set(arr.map(s => String(s).trim()))).filter(Boolean);

  return {
    scenes: scenes.slice(0, 4),
    props:  uniq(props).slice(0, 5),
    comms:  uniq(comms).slice(0, 5),
    care:   uniq(care).slice(0, 5)
  };
}

  // 10.7) Kink toggle
  byId("toggle-kink")?.addEventListener("change", e => {
    const sec = byId("kink-section");
    if (sec && sec.style) sec.style.display = e.target.checked ? "" : "none";
  });

  // 11) PDF export button
  if (els.pdfBtn && typeof html2pdf !== "undefined") {
    els.pdfBtn.addEventListener("click", () => {
      const source = document.querySelector("#results-root") || document.body;
      const date = new Date().toISOString().slice(0,10);
      const fname = `quiz-${(primary||"result").toLowerCase()}-${date}.pdf`;
      const opt = {
        margin: [0.5,0.5,0.5,0.5],
        filename: fname,
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
      };
      html2pdf().from(source).set(opt).save();
    });
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

/* ---- Section show/hide helpers (wrap target in a parent with [data-section]) ---- */
function sectionWrap(el){ return el?.closest?.("[data-section]") || null; }
function hideParentSection(el){ const w = sectionWrap(el); if (w) w.style.display = "none"; }
function showParentSection(el){ const w = sectionWrap(el); if (w) w.style.display = ""; }
function textOrHide(el, txt){
  if (!el) return;
  const val = (txt == null) ? "" : String(txt).trim();
  if (!val) {
    el.textContent = "";
    hideParentSection(el);
  } else {
    el.textContent = val;
    showParentSection(el);
  }
}

/* ---- Narrative field pickers ---- */
function pickDescription(details){
  return details?.description || details?.desc || "";
}

function arrayOrString(x){
  if (x == null) return null;
  if (Array.isArray(x)) return x;
  if (typeof x === "string") return x.trim() ? x : null;
  return null;
}
function arrayify(x){
  if (x == null) return [];
  if (Array.isArray(x)) return x;
  if (typeof x === "string") return x.trim() ? [x.trim()] : [];
  return [];
}
function pickOne(val){
  if (!val) return "";
  if (Array.isArray(val)) return val.length ? val[(Math.random()*val.length)|0] : "";
  return val;
}

function pickAffirmation(details, secondary){
  if (!details) return "";
  // Pair-specific
  const pair = details.pairings?.[secondary];
  const pairAff = arrayOrString(pair?.affirmations || pair?.affirmation);
  if (pairAff) return pickOne(pairAff);

  // Generic
  const gen = arrayOrString(details.affirmations || details.affirmation);
  return pickOne(gen) || "";
}

function pickInsights(details){
  // If explicit insights exist
  const ins = arrayOrString(details?.insights);
  if (Array.isArray(ins)) return ins.join(" ");
  if (typeof ins === "string" && ins.trim()) return ins.trim();

  // Fallback: strengths + growth_edges
  const strengths = arrayify(details?.strengths).slice(0,2);
  const edges = arrayify(details?.growth_edges).slice(0,2);
  const bits = [];
  if (strengths.length) bits.push(`You lead with ${strengths.join(" and ")}.`);
  if (edges.length) bits.push(`You grow fastest by practicing ${edges.join(" and ")}.`);
  return bits.join(" ");
}

function pickReflections(details){
  return arrayify(details?.reflection || details?.reflection_questions || details?.reflections);
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
function scoreTags(kinkItems, responses, opts){
  const primary = opts && opts.primary; // e.g., "Alchemist"
  const hits = {}, opps = {};

  for (let i = 0; i < (kinkItems || []).length; i++){
    const item = kinkItems[i] || {};
    const choices = item.choices || [];

    // Count opportunities: each appearance of a tag in a choice is one "opportunity" to select it
    for (let j = 0; j < choices.length; j++){
      const tags = choices[j].tags || [];
      for (let k = 0; k < tags.length; k++){
        const t = tags[k];
        opps[t] = (opps[t] || 0) + 1;
      }
    }

    // Normalize selected answers: array for multi, single value → 1-element array
    const raw = responses ? responses[item.id] : null;
    const selected = Array.isArray(raw) ? raw : (raw != null ? [raw] : []);

    // Increment hits; boost tags by the choice's weights for the primary archetype (if present)
    for (let j = 0; j < choices.length; j++){
      const c = choices[j];
      if (selected.indexOf(c.value) >= 0){
        let boost = 1;
        if (primary && c.weights && c.weights[primary]) {
          boost += 0.25 * Number(c.weights[primary] || 0); // gentle nudge from your weights
        }
        const tags = c.tags || [];
        for (let k = 0; k < tags.length; k++){
          const t = tags[k];
          hits[t] = (hits[t] || 0) + boost;
        }
      }
    }
  }

  // Convert to normalized scores
  const out = [];
  for (const t in opps){
    const s = (hits[t] || 0) / (opps[t] || 1);
    out.push([t, s]);
  }
  out.sort(function(a,b){ return b[1] - a[1]; });
  return out;
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

// 10.6) Kink translation (scenes, props, phrases, aftercare)
try {
  const kink = await buildKinkRecs(topTags, primary);
  if (kink) {
    fillList("kink-scenes", (kink.scenes || []).map(s =>
      `${s.title}: ${s.ideas?.[0] || "—"}${(s.stretch && s.stretch.length ? ` (stretch: ${s.stretch[0]})` : "")}`
    ));
    fillList("kink-props",  kink.props);
    fillList("kink-comms",  kink.comms);
    fillList("kink-care",   kink.care);
  }
  ensureKinkSectionVisibility();
} catch (e) {
  console.warn("Kink recs skipped:", e);
  ensureKinkSectionVisibility();
}

  // New: phrase and care dictionaries keyed by tag
  const PHRASE_BY_TAG = {
    praise_focus: "Praise: “I love the way you…” (specific, present).",
    attention_kink: "Spotlight: “This is your moment.”",
    poetic_voice: "Evocative one-liner you both like.",
    command_energy: "Directive: “Stand. Breathe. Return.”",
    order_prompts: "Prompt: “On my count—one, two, three.”",
    minimal_signals: "Gesture cue for pause/slow.",
    protocol_signals: "Color cue for pace (green/yellow).",
    trance_adjacent: "Soft cue: “Follow my voice and breathe.”"
  };
  const CARE_BY_TAG = {
    aftercare_soft: "Water, warmth, quiet check-in ~10 minutes later.",
    grounding: "5-4-3-2-1 senses + slow breathing.",
    stability: "Predictable close: blanket + calm song.",
    attunement: "30-second breathing together to land."
  };

  // Light archetype bias
  const bias = new Set((map.archetype_bias?.[primary]) || []);
  const ranked = (topTags || []).map(([tag, score]) => {
    const bonus = bias.has(tag) ? 0.15 : 0;
    return { tag, score: (score || 0) + bonus };
  }).sort((a,b) => b.score - a.score);

  // Group by taxonomy category
  const byCat = new Map();
  for (const r of ranked) {
    const meta = tax.tags?.[r.tag];
    if (!meta) continue;
    const cat = meta.category || "Misc";
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push({ tag: r.tag, meta, score: r.score });
  }

  // Build sections
  const scenes = [], props = [], comms = [], care = [];
  for (const [cat, items] of byCat) {
    for (const it of items.slice(0, 2)) { // top 1–2 per category
      const m = it.meta;
      scenes.push({
        title: `${cat}: ${it.tag}`,
        ideas: (m.beginner && m.beginner.slice(0,1)) || [],
        stretch: (m.advanced && m.advanced.slice(0,1)) || [],
        safety: m.safety || []
      });
      if (m.beginner && m.beginner.length) props.push(m.beginner[0]);

      // Existing routes
      if (cat === "Ritual & Symbol")    comms.push("One-sentence intention + breath");
      if (cat === "Power/Service")      comms.push("Check-in phrase: “Would you like service now or later?”");
      if (cat === "Impact")             care.push("Aftercare: warmth + water + check-in ~10 min later");

      // New routes
      if (cat === "Communication & Voice" && PHRASE_BY_TAG[it.tag]) {
        comms.push(PHRASE_BY_TAG[it.tag]);
      }
      if (cat === "Care & Recovery" && CARE_BY_TAG[it.tag]) {
        care.push(CARE_BY_TAG[it.tag]);
      }
    }
  }

  return {
    scenes: scenes.slice(0,3),
    props:  Array.from(new Set(props)).slice(0,5),
    comms:  Array.from(new Set(comms)).slice(0,3),
    care:   Array.from(new Set(care)).slice(0,3)
  };

/* ---- Dynamic narrative helpers (uses /data) ---- */
async function buildDynamicNarrative(allResponses, topTags, primary) {
  // Load rulebook (optional file; function safely falls back)
  let rules;
  try {
    rules = await loadJSON(`${DATA_BASE}quiz_dynamic_rules.json?v=1`);
  } catch {
    return { affirmations: [], insights: [], explore: [], growth: [], reasons: [] };
  }

  const acc = { affirmations: [], insights: [], explore: [], growth: [], reasons: [] };

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

    if (match) {
      if (rule.then?.reason) acc.reasons.push(rule.then.reason);
      mergeBuckets(acc, rule.then || {});
    }
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
  for (const k of ["affirmations","insights","explore","growth","reasons"]) {
    acc[k] = Array.from(new Set(acc[k])).slice(0, k === "insights" ? 6 : 6);
  }
  return acc;
}

function mergeBuckets(acc, add) {
  for (const k of ["affirmations","insights","explore","growth"]) {
    if (add[k]) acc[k].push(...[].concat(add[k]));
  }
}

/* ---- List filler that hides empty sections ---- */
function fillList(id, items) {
  const ul = document.getElementById(id);
  if (!ul) return;
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) {
    ul.innerHTML = "";
    hideParentSection(ul);
  } else {
    ul.innerHTML = list.map(t => `<li>${t}</li>`).join("");
    showParentSection(ul);
  }
}
/* ---- “Why this result?” chips ---- */
function renderWhyChips(reasons, topTags){
  const el = byId("why-chips");
  if (!el) return;

  const R = Array.isArray(reasons) ? reasons.filter(Boolean).slice(0, 4) : [];
  const T = Array.isArray(topTags) ? topTags.slice(0, 4).map(([t]) => t).filter(Boolean) : [];

  if (!R.length && !T.length) {
    el.innerHTML = "";
    el.style.display = "none";
    return;
  }

  const mk = (title, items) =>
    items.length
      ? `<div class="chip-group"><span class="chip-label">${escapeHTML(title)}:</span>${items.map(x => `<span class="chip">${escapeHTML(x)}</span>`).join("")}</div>`
      : "";

  el.style.display = "";
  el.innerHTML = mk("Because you answered", R) + mk("Top interests", T);
}

function escapeHTML(s){
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}
function ensureKinkSectionVisibility(){
  const sec = byId("kink-section");
  if (!sec) return;
  const hasAny = ["kink-scenes","kink-props","kink-comms","kink-care"]
    .some(id => {
      const ul = byId(id);
      return ul && ul.children && ul.children.length > 0;
    });
  sec.style.display = hasAny ? "" : "none";
}
