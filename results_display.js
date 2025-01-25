// Results Display Logic
document.addEventListener("DOMContentLoaded", function () {
    const primaryArchetypeEl = document.getElementById("primary-archetype");
    const secondaryArchetypeEl = document.getElementById("secondary-archetype");
    const archetypeDescriptionEl = document.getElementById("archetype-description");
    const affirmingMessageEl = document.getElementById("affirming-message");
    const personalizedInsightsEl = document.getElementById("personalized-insights");
    const reflectionListEl = document.getElementById("reflection-list");

    // Retrieve stored quiz results
    let results = JSON.parse(localStorage.getItem("quizResults"));

    if (results) {
        // Update DOM Elements
        primaryArchetypeEl.textContent = results.primaryArchetype;
        secondaryArchetypeEl.textContent = results.secondaryArchetypes.join(", ");
        archetypeDescriptionEl.textContent = results.descriptions[results.primaryArchetype] || "An insightful and unique perspective.";
        affirmingMessageEl.textContent = results.affirmingMessage;
        personalizedInsightsEl.textContent = results.personalizedInsights;

        // Populate Reflection Questions
        results.reflectionQuestions.forEach(question => {
            let li = document.createElement("li");
            li.textContent = question;
            reflectionListEl.appendChild(li);
        });
    } else {
        // Handle error (if no results found)
        primaryArchetypeEl.textContent = "Error: No results found!";
        archetypeDescriptionEl.textContent = "Please retake the quiz.";
    }
});
