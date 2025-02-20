/* results.js */
document.addEventListener("DOMContentLoaded", function () {
  console.log("📌 Results Page Loaded!");

  const primaryArchetypeElement = document.getElementById("primary-archetype");
  const secondaryArchetypeElement = document.getElementById("secondary-archetype");
  const archetypeDescriptionElement = document.getElementById("archetype-description");
  const affirmingMessageElement = document.getElementById("affirming-message");
  const personalizedInsightsElement = document.getElementById("personalized-insights");
  const reflectionListElement = document.getElementById("reflection-list");

  // Retrieve saved results from sessionStorage (should be an array of archetypes)
  const savedResults = sessionStorage.getItem("quizResults");
  if (!savedResults) {
    console.error("❌ Error: No quiz results found. Please retake the quiz.");
    primaryArchetypeElement.innerText = "Error: No Results Found";
    return;
  }
  const archetypes = JSON.parse(savedResults);
  console.log("🏆 Retrieved Quiz Results:", archetypes);

  // Display primary and secondary archetypes
  primaryArchetypeElement.innerText = archetypes[0] || "Unknown";
  secondaryArchetypeElement.innerText = archetypes[1] || "None";

  // Fetch additional narrative details based on the primary archetype
  fetch("quiz_data.json")
    .then(response => response.json())
    .then(data => {
      console.log("📂 Fetched quiz_data.json:", data);
      if (data && data.archetypes) {
        const primary = archetypes[0];
        const archetypeDetails = data.archetypes[primary];
        if (archetypeDetails) {
          archetypeDescriptionElement.innerText = archetypeDetails.description || "No description available.";
          affirmingMessageElement.innerText = archetypeDetails.affirmation || "You are uniquely powerful!";
          personalizedInsightsElement.innerText = archetypeDetails.insights || "Explore your strengths!";
          // Populate Reflection Questions if available
          reflectionListElement.innerHTML = "";
          if (archetypeDetails.reflection && archetypeDetails.reflection.length > 0) {
            archetypeDetails.reflection.forEach(question => {
              let li = document.createElement("li");
              li.innerText = question;
              reflectionListElement.appendChild(li);
            });
          } else {
            console.warn("No reflection questions found for this archetype.");
          }
        } else {
          console.warn("⚠️ Archetype details not found in quiz_data.json for:", primary);
        }
      } else {
        console.error("❌ quiz_data.json is missing the expected 'archetypes' key.");
      }
    })
    .catch(error => console.error("❌ Error loading quiz_data.json:", error));

  // PDF Export Functionality
  document.getElementById("export-pdf").addEventListener("click", function () {
    const element = document.querySelector(".results-container");
    html2pdf().from(element).save("Quiz_Results.pdf");
  });

  // Email Results Functionality
  document.getElementById("email-results").addEventListener("click", function () {
    const resultsText = document.querySelector(".results-container").innerText;
    const emailBody = encodeURIComponent(resultsText);
    window.location.href = `mailto:?subject=My Quiz Results&body=${emailBody}`;
  });

  // Render Spider Graph
  renderSpiderGraph();
});

function renderSpiderGraph() {
  const ctx = document.getElementById("spider-graph").getContext("2d");
  // Placeholder data – replace with your actual archetype scores if available
  const scores = {
    "Catalyst": 8,
    "Explorer": 7,
    "Keystone": 5,
    "Vanguard": 6,
    "Advocate": 4,
    "Connoisseur": 3,
    "Oracle": 7,
    "Alchemist": 5
  };
  new Chart(ctx, {
    type: "radar",
    data: {
      labels: Object.keys(scores),
      datasets: [{
        label: "Archetype Influence",
        data: Object.values(scores),
        backgroundColor: "rgba(90, 103, 216, 0.2)",
        borderColor: "#5a67d8",
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          suggestedMin: 0,
          suggestedMax: 10
        }
      }
    }
  });
}

