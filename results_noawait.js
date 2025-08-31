
/* results.js (no-await variant, 2025-08-30)
   - Avoids 'await' entirely.
   - Tries multiple base paths for JSON.
   - Gracefully degrades if quiz_data.json is missing.
*/

(function(){
  document.addEventListener("DOMContentLoaded", initResults);

  var BASES = ["data/", "./data/", "../data/", "quiz_sections/", "./", "../"];

  function loadJSON(url){
    return fetch(url, { cache: "no-store" }).then(function(res){
      if (!res.ok) throw new Error(url + " → " + res.status);
      return res.json();
    });
  }

  function tryMany(filename){
    var urls = BASES.map(function(b){ return (b.endsWith("/") ? b : b + "/") + filename; });
    var attempt = function(i){
      if (i >= urls.length) return Promise.reject(new Error("All sources failed for " + filename));
      return loadJSON(urls[i]).then(function(j){
        console.info("[results] loaded:", urls[i]);
        return j;
      }).catch(function(){
        console.warn("[results] missing:", urls[i]);
        return attempt(i+1);
      });
    };
    return attempt(0);
  }

  function byId(id){ return document.getElementById(id); }
  function setText(el, txt){ if (el) el.textContent = (txt == null ? "—" : txt); }
  function textOrHide(el, txt){
    if (!el) return;
    if (txt && String(txt).trim()){
      el.textContent = txt;
      var sec = el.closest("[data-section]");
      if (sec) sec.classList.remove("hidden");
    } else {
      var sec2 = el.closest("[data-section]");
      if (sec2) sec2.classList.add("hidden");
    }
  }

  function safe(k, fb){
    try { var v = JSON.parse(sessionStorage.getItem(k)); return (v == null ? fb : v); } catch(e){ return fb; }
  }

  function initResults(){
    var els = {
      primary: byId("primary-archetype"),
      secondary: byId("secondary-archetype"),
      primaryImg: byId("primary-image"),
      secondaryImg: byId("secondary-image"),
      desc: byId("archetype-description"),
      affirm: byId("affirming-message"),
      insights: byId("personalized-insights"),
      reflList: byId("reflection-list"),
      radar: byId("scores-radar"),
      why: byId("why-chips"),
      recs: byId("top-interests")
    };

    var IMG_MAP = {
      Catalyst:"images/archetypes/Catalyst.png",
      Explorer:"images/archetypes/Explorer.png",
      Keystone:"images/archetypes/Keystone.png",
      Vanguard:"images/archetypes/Vanguard.png",
      Oracle:"images/archetypes/Oracle.png",
      Connoisseur:"images/archetypes/Connoisseur.png",
      Alchemist:"images/archetypes/Alchemist.png"
    };
    var ARCHETYPES = Object.keys(IMG_MAP);

    var savedRes = safe("quizResults", null);
    var savedPrimary=null, savedSecondary=null;
    if (Array.isArray(savedRes)) { savedPrimary = savedRes[0]; savedSecondary = savedRes[1]; }
    else if (savedRes && typeof savedRes === "object") { savedPrimary = savedRes.primary; savedSecondary = savedRes.secondary; }

    var rawScores = safe("archetypeScores", {}) || {};
    var allResponses = safe("quizResponses", {}) || {};

    var top = getTopTwo(rawScores, ARCHETYPES, savedPrimary, savedSecondary);
    var primary = top[0], secondary = top[1];
    setText(els.primary, primary || "—");
    setText(els.secondary, secondary || "—");
    setArchetypeImage(els.primaryImg, primary, IMG_MAP);
    setArchetypeImage(els.secondaryImg, secondary, IMG_MAP);

    // Chain: load optional prefStrength -> optional kinkInterests -> required quiz_data (graceful)
    var prefStrength = {};
    var kinkInterests = [];

    tryMany("preference_strength.json")
      .then(function(ps){ prefStrength = ps || {}; })
      .catch(function(){ /* optional */ })
      .then(function(){
        return tryMany("kink_interests.json").then(function(k){
          var arr = Array.isArray(k && k.items) ? k.items : (k || []);
          kinkInterests = arr;
        }).catch(function(){ /* optional */ });
      })
      .then(function(){
        return tryMany("quiz_data.json")
          .then(function(d){
            var archeData = (d && d.archetypes) ? d.archetypes : d;
            if (archeData){
              var details = archeData[primary] || {};
              textOrHide(els.desc, pickDescription(details));
              textOrHide(els.affirm, pickAffirmation(details, secondary));
              textOrHide(els.insights, pickInsights(details));
              if (els.reflList) renderList(els.reflList, pickReflections(details));
            } else {
              renderPlaceholders();
            }
          })
          .catch(function(){
            renderPlaceholders();
          });
      })
      .then(function(){
        // Radar if Chart.js present
        try { renderRadar(els.radar, rawScores); } catch(e){}
        renderWhyChips(els.why, rawScores, prefStrength);
        renderRecs(els.recs, kinkInterests, allResponses);
      });

    function renderPlaceholders(){
      textOrHide(els.desc, "No description available.");
      textOrHide(els.affirm, "You are growing into your strengths.");
      textOrHide(els.insights, "");
      if (els.reflList) renderList(els.reflList, []);
    }
  }

  function getTopTwo(scores, ARCHS, pref, sec){
    if (pref && sec) return [pref, sec];
    var entries = Object.keys(scores || {}).map(function(k){ return [k, scores[k]]; })
      .filter(function(x){ return ARCHS.indexOf(x[0]) >= 0; });
    entries.sort(function(a,b){ return (b[1]||0) - (a[1]||0); });
    var first = pref || (entries[0] && entries[0][0]) || "—";
    var second = sec || (entries[1] && entries[1][0]) || "—";
    return [first, second];
  }

  function setArchetypeImage(imgEl, name, IMG_MAP){
    if (!imgEl) return;
    var src = IMG_MAP[name] || "";
    if (src) { imgEl.src = src; imgEl.alt = name + " icon"; }
    else { imgEl.removeAttribute("src"); imgEl.alt = ""; }
  }

  function pickDescription(details){
    return details.description || (Array.isArray(details.descriptions) ? details.descriptions[0] : "") || "";
  }
  function pickAffirmation(details, secondary){
    var a = details.affirmation || details.affirmations;
    if (Array.isArray(a) && a.length) return a[0];
    return a || "";
  }
  function pickInsights(details){
    var i = details.insights || details.personalized_insights || details.notes;
    if (Array.isArray(i)) return i.join(" ");
    return i || "";
  }
  function pickReflections(details){
    var r = details.reflection_questions || details.reflections;
    if (Array.isArray(r)) return r;
    return [];
  }

  function renderList(ul, items){
    if (!ul) return;
    ul.innerHTML = "";
    (items || []).forEach(function(txt){
      var li = document.createElement("li");
      li.textContent = txt;
      ul.appendChild(li);
    });
  }

  function renderRadar(canvas, scores){
    if (!window.Chart || !canvas) return;
    var labels = Object.keys(scores || {});
    var data = labels.map(function(k){ return scores[k] || 0; });
    var maxVal = Math.max.apply(null, [10].concat(data));
    new Chart(canvas, {
      type: "radar",
      data: { labels: labels, datasets: [{ label: "Scores", data: data }] },
      options: { scales: { r: { beginAtZero: true, max: maxVal } }, plugins:{ legend:{ display:false } } }
    });
  }

  function renderWhyChips(container, scores, prefStrength){
    if (!container) return;
    container.innerHTML = "";
    var entries = Object.keys(scores || {}).map(function(k){ return [k, scores[k]]; });
    entries.sort(function(a,b){ return (b[1]||0)-(a[1]||0); });
    entries.slice(0,5).forEach(function(pair){
      var chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = pair[0] + ": " + Math.round(((pair[1]||0)*10))/10;
      container.appendChild(chip);
    });
  }

  function renderRecs(container, items, allResponses){
    if (!container) return;
    container.innerHTML = "";
    (items || []).slice(0,6).forEach(function(x){
      var li = document.createElement("li");
      li.textContent = (typeof x === "string") ? x : ((x && x.name) || JSON.stringify(x));
      container.appendChild(li);
    });
  }

})();
