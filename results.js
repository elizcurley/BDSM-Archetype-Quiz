/* results.js — clean, robust, extensible */

document.addEventListener("DOMContentLoaded", initResults);

async function initResults() {
  // ---------- DOM ----------
  const els = {
    primary:   byId("primary-archetype"),
    secondary: byId("secondary-archetype"),
    desc:      byId("archetype-description"),
    affirm:    byId("affirming-message"),
    insights:  byId("personalized-insights"),
    reflList:  byId("reflection-list"),
    primaryImg:   byId("primary-image"),
    secondaryImg: byId("secondary-image"),
    radar:     byId("spider-graph"),
    fitWrap:   byId("fit-check"),
    pdfBtn:    byId("export-pdf"),
    recsWrap:  byId("top-interests") // optional container for tag recs
  };

  // ---------- Constants ----------
  const ARCHETYPES = ["Alchemist","Catalyst","Connoisseur","Explorer","Keystone","Oracle","Vanguard"];
  const IMG_MAP = {
    Catalyst: "images/archetypes/Catalyst.png",
    Explorer: "images/archetypes/Explorer.png",
    Keystone: "images/archetypes/Keystone.png",
    Vanguard: "images/archetypes/Vanguard.png",
    Oracle: "images/archetypes/Oracle.png",
    Connoisseur: "images/archetypes/Connoisseur.png",
    Alchemist: "images/archetypes/Alchemist.png"
  };

  // ---------- Load stored results ----------
  const savedResults = sessionStorage.getItem("quizResults");
  let [primary, secondary] = JSON.parse(savedResults || "[]") || [];

  // Archetype scores object (whatever your engine saved)
  // Expect shape like { Archetype: number }. Could be 0–10 or 0–100 etc.
  const rawScores = safeJSON(sessionStorage.getItem("archetypeScores"), {});

  // Derive primary/secondary if missing
  if (!primary || !secondary) {
    const top2 = topTwoFromScores(rawScores, ARCHETYPES);
    primary = primary || top2[0] || "—";
    secondary = secondary || top2[1] || "—";
  }

  // ---------- Render names + images ----------
  setText(els.primary, primary || "—");
  setText(els.secondary, secondary || "—");
  setArchetypeImage(els.primaryImg, primary, IMG_MAP);
  setArchetypeImage(els.secondaryImg, secondary, IMG_MAP);

  // ---------- Load narratives (description / affirmation / insights / reflection) ----------
  try {
    const data = await fetch("quiz_data.json").then(r => r.json());
    const details = (data.archetypes || {})[primary] || {};
    setText(els.desc,    details.description || "—");
    setText(els.affirm,  details.affirmation || "—");
    if (els.insights) {
      if (Array.isArray(details.insights)) setText(els.insights, details.insights.join(" "));
      else setText(els.insights, details.insights || "—");
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

  // ---------- Radar chart ----------
  // Use whatever scale your engine saved; we’ll show it as-is with a sensible suggested range.
  if (els.radar && typeof Chart !== "undefined") {
    let labels = Object.keys(rawScores);
    let dataVals = labels.map(k => Number(rawScores[k] ?? 0));

    if (!labels.length) {
      // fallback ordering and zeros
      labels = ARCHETYPES.slice();
      dataVals = labels.map(() => 0);
    }

    const maxVal = Math.max(10, ...dataVals, 0); // try to auto-fit
    new Chart(els.radar.getContext("2d"), {
      type: "radar",
      data: {
        labels,
        datasets: [{
          label: "Archetype Balance",
          data: dataVals,
          backgroundColor: "rgba(90, 103, 216, 0.18)",
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

  // ---------- Optional Fit-Check slider ----------
  if (els.fitWrap) {
    els.fitWrap.innerHTML = `
      <label for="fitRange">How much does this result fit you right now?</label>
      <div style="margin:8px 0">
        <input id="fitRange" type="range" min="1" max="7" step="1" value="4">
        <output id="fitOut" style="margin-left:8px">4</output>/7
      </div>`;
    const range = byId("fitRange");
    const out = byId("fitOut");
    range?.addEventListener("input", () => { out.textContent = range.value; });
  }

  // ---------- Tag-based interests (only if responses exist) ----------
  // Expect a per-section responses object like:
  //   sessionStorage.quizResponses = JSON.stringify({ kink_interests: { KI1: ["make"], KI2: ["leather","silk"], ... } })
  try {
    const allResponses = safeJSON(sessionStorage.getItem("quizResponses"), {});
    const kiResponses = allResponses.kink_interests || null;

    if (kiResponses && els.recsWrap) {
      const kiItems = await fetch("quiz_sections/kink_interests.json").then(r => r.json());
      const topTags = scoreTags(kiItems, kiResponses).slice(0, 7); // [ [tag,score], ... ]
      renderTopTagCard(els.recsWrap, topTags, primary);
    }
  } catch (e) {
    console.warn("Tag scoring skipped:", e);
  }

  // ---------- PDF export ----------
  if (els.pdfBtn && typeof html2pdf !== "undefined") {
    els.pdfBtn.addEventListener("click", () => {
      // Choose the container you want to print
      const source = document.querySelector("#results-root") || document.body;
      const opt = {
        margin:       [0.5, 0.5, 0.5, 0.5],
        filename:     `quiz-results-${Date.now()}.pdf`,
        image:        { type: "jpeg", quality: 0.96 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: "in", format: "letter", orientation: "portrait" }
      };
      html2pdf().from(source).set(opt).save();
    });
  }
}

/* =========================
   Helpers + Scoring utils
   ========================= */

function byId(id) { return document.getElementById(id); }
function setText(el, txt) { if (el) el.textContent = txt; }
function niceCeil(n) {
  const s = [10, 12, 15, 20, 25, 30, 40, 50, 60, 75, 100];
  for (const x of s) if (n <= x) return x;
  return Math.ceil(n);
}

function setArchetypeImage(imgEl, name, map) {
  if (!imgEl || !name) return;
  const src = map[name];
  if (!src) { imgEl.style.display = "none"; return; }
  imgEl.src = src;
  imgEl.alt = `${name} archetype icon`;
  imgEl.loading = "lazy";
  imgEl.onerror = () => { imgEl.style.display = "none"; };
}

function safeJSON(str, fallback) {
  try { return JSON.parse(str ?? ""); } catch { return fallback; }
}

function topTwoFromScores(scores, orderFallback) {
  const entries = Object.entries(scores).filter(([_, v]) => typeof v === "number");
  if (!entries.length) return [orderFallback?.[0] || null, orderFallback?.[1] || null];
  entries.sort((a,b) => b[1] - a[1]);
  const [p, s] = entries;
  return [p?.[0] || null, s?.[0] || null];
}

/* ---------- Tag scoring (normalized) ---------- */
function scoreTags(kinkInterestsItems, responses) {
  const hits = {}, opps = {};
  for (const item of kinkInterestsItems) {
    const itemTags = new Set();
    for (const c of item.choices) (c.tags || []).forEach(t => itemTags.add(t));
    itemTags.forEach(t => opps[t] = (opps[t] || 0) + 1);

    const picked = new Set(responses[item.id] || []);
    for (const c of item.choices) {
      if (picked.has(c.value)) (c.tags || []).forEach(t => hits[t] = (hits[t] || 0) + 1);
    }
  }
  const scores = Object.fromEntries(
    Object.keys(opps).map(t => [t, (hits[t] || 0) / opps[t]])
  );
  return Object.entries(scores).sort((a,b) => b[1] - a[1]); // [tag, score] desc
}

/* ---------- Render simple "Top Interests" card ---------- */
function renderTopTagCard(container, topTags, primaryArchetype) {
  if (!container) return;
  const mk = ([tag, sc]) => `<li><strong>${tag}</strong> — ${(sc*100|0)}%</li>`;
  container.innerHTML = `
    <h3 class="mt-6">Top Interests (from your answers)</h3>
    <p class="muted">These hint at scenes, materials, and vibes you might enjoy.</p>
    <ul class="tag-list">
      ${topTags.map(mk).join("")}
    </ul>
    <p class="muted">We’ll tune suggestions slightly toward your primary archetype: <em>${primaryArchetype || "—"}</em>.</p>
  `;
}
