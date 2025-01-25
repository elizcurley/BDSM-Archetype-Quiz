// Results Display Logic
document.addEventListener("DOMContentLoaded", function () {
    const resultsContainer = document.getElementById("results-container");
    const primaryArchetypeSpan = document.getElementById("primary-archetype");
    const archetypeDescription = document.getElementById("archetype-description");
    const secondaryArchetypeSpan = document.getElementById("secondary-archetype");
    const affirmingMessage = document.getElementById("affirming-message");
    const personalizedInsights = document.getElementById("personalized-insights");
    const reflectionList = document.getElementById("reflection-list");

    // Retrieve stored results
    let storedResults = localStorage.getItem("quizResults");
    
    if (storedResults) {
        let results = JSON.parse(storedResults);

        // Display Primary Archetype
        primaryArchetypeSpan.textContent = results.primaryArchetype;
        archetypeDescription.textContent = results.descriptions[results.primaryArchetype];

        // Display Secondary Archetype(s)
        secondaryArchetypeSpan.textContent = results.secondaryArchetypes.join(", ") || "None";

        // Display Affirming Message
        affirmingMessage.textContent = results.affirmingMessage;

        // Display Personalized Insights
        personalizedInsights.textContent = results.personalizedInsights;

        // Display Reflection Questions
        results.reflectionQuestions.forEach(question => {
            let listItem = document.createElement("li");
            listItem.textContent = question;
            reflectionList.appendChild(listItem);
        });

        // Render Spider Graph
        renderSpiderGraph(results);
    } else {
        resultsContainer.innerHTML = `<p>Error: No quiz results found. Please take the quiz again.</p>`;
    }
});

// Function to Render Spider Graph
function renderSpiderGraph(results) {
    const ctx = document.getElementById("spider-graph").getContext("2d");
    new Chart(ctx, {
        type: "radar",
        data: {
            labels: Object.keys(results.descriptions),
            datasets: [{
                label: "Archetype Influence",
                data: Object.values(results.descriptions).map(() => Math.random() * 100),
                backgroundColor: "rgba(54, 162, 235, 0.2)",
                borderColor: "rgba(54, 162, 235, 1)",
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}
