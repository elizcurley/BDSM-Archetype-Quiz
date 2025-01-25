document.addEventListener("DOMContentLoaded", function () {
    const resultsContainer = document.querySelector(".results-container");
    const primaryArchetypeElement = document.getElementById("primary-archetype");
    const secondaryArchetypeElement = document.getElementById("secondary-archetype");
    const archetypeDescriptionElement = document.getElementById("archetype-description");
    const affirmingMessageElement = document.getElementById("affirming-message");
    const personalizedInsightsElement = document.getElementById("personalized-insights");
    const reflectionListElement = document.getElementById("reflection-list");

    // Retrieve stored results from localStorage
    const storedResults = JSON.parse(localStorage.getItem("quizResults"));

    if (!storedResults) {
        resultsContainer.innerHTML = "<p>Error: No quiz results found. Please retake the quiz.</p>";
        return;
    }

    // Extract data
    const { primaryArchetype, secondaryArchetypes, insights, affirmingMessage, reflectionQuestions } = storedResults;

    // Update HTML elements with results
    primaryArchetypeElement.textContent = primaryArchetype;
    secondaryArchetypeElement.textContent = secondaryArchetypes.join(", ");
    archetypeDescriptionElement.textContent = insights;
    affirmingMessageElement.textContent = affirmingMessage;

    // Populate reflection questions
    reflectionQuestions.forEach((question) => {
        let li = document.createElement("li");
        li.textContent = question;
        reflectionListElement.appendChild(li);
    });

    // Spider Graph Rendering
    if (storedResults.archetypeScores) {
        renderSpiderGraph(storedResults.archetypeScores);
    }

    // PDF Export Functionality
    document.getElementById("export-pdf").addEventListener("click", function () {
        exportToPDF();
    });

    // Email Results Functionality
    document.getElementById("email-results").addEventListener("click", function () {
        emailResults();
    });
});

// Function to Render Spider Graph
function renderSpiderGraph(scores) {
    const ctx = document.getElementById("spider-graph").getContext("2d");
    new Chart(ctx, {
        type: "radar",
        data: {
            labels: Object.keys(scores),
            datasets: [{
                label: "Archetype Strength",
                data: Object.values(scores),
                fill: true,
                borderColor: "#5a67d8",
                backgroundColor: "rgba(90, 103, 216, 0.2)"
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

// Function to Export Results as PDF
function exportToPDF() {
    const element = document.querySelector(".results-container");
    html2pdf().from(element).save("Quiz_Results.pdf");
}

// Function to Email Results
function emailResults() {
    const resultsText = document.querySelector(".results-container").innerText;
    const emailBody = encodeURIComponent(resultsText);
    window.location.href = `mailto:?subject=My Quiz Results&body=${emailBody}`;
}
