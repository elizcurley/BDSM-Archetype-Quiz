<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
<script defer src="results.js"></script>





/* results.js */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Elements
    const primaryEl   = document.getElementById("primary-archetype");
    const secondaryEl = document.getElementById("secondary-archetype");
    const descEl      = document.getElementById("archetype-description");
    const affirmEl    = document.getElementById("affirming-message");
    const insightsEl  = document.getElementById("personalized-insights");
    const reflEl      = document.getElementById("reflection-list");

    // Results from quiz.js
    const results = JSON.parse(sessionStorage.getItem("quizResults") || "[]");          // [primary, secondary]
    const scores  = JSON.parse(sessionStorage.getItem("archetypeScores") || "{}");      // { Archetype: 0..10 }
    

    if (!Array.isArray(results) || !results.length) {
      if (primaryEl) primaryEl.textContent = "Error: No Results Found";
      console.error("No quiz results in sessionStorage.");
      return;
    }

    const [primary, secondary] = results;
    if (primaryEl)   primaryEl.textContent   = primary || "—";
    if (secondaryEl) secondaryEl.textContent = secondary || "—";

    // Load narratives
    try {
      const data = await fetch("quiz_data.json").then(r => r.json());
      const details = (data.archetypes || {})[primary] || {};
      if (descEl)   descEl.textContent   = details.description  || "—";
      if (affirmEl) affirmEl.textContent = details.affirmation  || "—";
      if (insightsEl) {
        if (Array.isArray(details.insights)) insightsEl.textContent = details.insights.join(" ");
        else insightsEl.textContent = details.insights || "—";
      }
      if (reflEl) {
        reflEl.innerHTML = "";
        (details.reflection || []).forEach(q => {
          const li = document.createElement("li");
          li.textContent = q;
          reflEl.appendChild(li);
        });
      }
    } catch (e) {
      console.warn("quiz_data.json load issue:", e);
    }

    // Radar chart
    const canvas = document.getElementById("spider-graph");
    if (canvas && typeof Chart !== "undefined") {
      let labels = Object.keys(scores);
      let dataVals = labels.map(k => Number(scores[k] ?? 0));
      if (!labels.length) {
        // Fallback ordering used by your engine
        labels = ["Catalyst","Explorer","Keystone","Vanguard","Oracle","Connoisseur","Alchemist"];
        dataVals = labels.map(() => 0);
      }
      new Chart(canvas.getContext("2d"), {
        type: "radar",
        data: {
          labels,
          datasets: [{
            label: "Archetype Balance (0–10)",
            data: dataVals,
            backgroundColor: "rgba(90, 103, 216, 0.2)",
            borderColor: "#5a67d8",
            borderWidth: 2
          }]
        },
        options: { responsive: true, scales: { r: { suggestedMin: 0, suggestedMax: 10 } } }
      });
    }

    // Optional Fit-Check slider (post-result, unscored)
    const fitWrap = document.getElementById("fit-check");
    if (fitWrap) {
      fitWrap.innerHTML = `
        <label for="fitRange">How much does this result fit you right now?</label>
        <div style="margin:8px 0">
          <input id="fitRange" type="range" min="1" max="7" step="1" value="4">
          <output id="fitOut" style="margin-left:8px">4</output>/7
        </div>`;
      const range = document.getElementById("fitRange");
      const out = document.getElementById("fitOut");
      range.addEventListener("input", () => { out.textContent = range.value; });
    }

    // PDF export (guard if lib/button missing)
    const pdfBtn = document.getElementById("export-pdf");
    if (pdfBtn && typeof html2pdf !== "undefined") {
