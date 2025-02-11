// 📌 Prevent Duplicate Script Execution
if (window.quizLoaded) {
    console.warn("⚠️ Quiz.js already loaded – Skipping duplicate execution.");
} else {
    window.quizLoaded = true;

    // 📌 Quiz State Variables
    let quizQuestions = [];
    let currentQuestionIndex = 0;
    let userResponses = {};

    // 📌 DOM Elements
    const introContainer = document.getElementById("intro-container");
    const quizContainer = document.getElementById("quiz-container");
    const questionText = document.getElementById("question-text");
    const optionsContainer = document.getElementById("options-container");
    const nextButton = document.getElementById("next-button");
    const backButton = document.getElementById("back-button");
    const startButton = document.getElementById("start-button");

    // 📌 Confirm Script is Running
    console.log("✅ quiz.js Loaded Successfully!");

    // 📌 Load Quiz Data from JSON
    fetch('quiz_data.json')
        .then(response => response.json())
        .then(data => {
            console.log("✅ JSON Loaded Successfully:", data);

            if (!data.sections || !data.sections.foundational_assessment) {
                console.error("❌ JSON Format Error: Sections missing.");
                return;
            }

            quizQuestions = data.sections.foundational_assessment.questions;
            console.log("📌 Extracted Questions:", quizQuestions);

            loadProgress(); 
        })
        .catch(error => console.error("❌ Error loading JSON:", error));

    // 📌 Save Quiz Progress to Session Storage
    function saveProgress() {
        sessionStorage.setItem("quizProgress", JSON.stringify({ 
            currentQuestionIndex, 
            userResponses 
        }));
    }

    // 📌 Load Quiz Progress from Session Storage
    function loadProgress() {
        const savedProgress = JSON.parse(sessionStorage.getItem("quizProgress"));
        if (savedProgress) {
            currentQuestionIndex = savedProgress.currentQuestionIndex || 0;
            userResponses = savedProgress.userResponses || {};
        }
    }

    // 📌 Start Quiz (Shows First Question)
    function startQuiz() {
        console.log("🚀 Start Button Clicked! Starting Quiz...");
        introContainer.style.display = "none"; // Hide intro screen
        quizContainer.style.display = "block"; // Show quiz container
        loadQuestion();
    }

    // 📌 Load Question
    function loadQuestion() {
        console.log("📌 Loading Question Index:", currentQuestionIndex);

        if (quizQuestions.length === 0) {
            console.error("❌ No Questions Found in JSON!");
            return;
        }

        if (currentQuestionIndex >= quizQuestions.length) {
            calculateResults();
            return;
        }

        const currentQuestion = quizQuestions[currentQuestionIndex];
        console.log("🎯 Current Question:", currentQuestion);

        if (!currentQuestion) {
            console.error("❌ Current Question is Undefined! Check JSON format.");
            return;
        }

        questionText.innerText = currentQuestion.question_text;
        optionsContainer.innerHTML = "";

        currentQuestion.response_options.forEach((option, index) => {
            const button = document.createElement("button");
            button.innerText = option;
            button.classList.add("option-button");
            button.onclick = () => selectOption(index, currentQuestion.id, currentQuestion.weight);
            optionsContainer.appendChild(button);
        });

        backButton.style.display = currentQuestionIndex > 0 ? "block" : "none";
        nextButton.style.display = "none"; // Hide next button until an answer is chosen

        saveProgress();
    }

    // 📌 Select Option
 function selectOption(index, questionId, weight) {
    console.log("👉 Option Selected:", index, "for Question:", questionId, "Weight:", weight);

    // ✅ Ensure userResponses exists
    if (!userResponses) {
        userResponses = {};
    }

    userResponses[questionId] = { selectedOption: index, weight: weight };
    console.log("🔄 Updated User Responses:", userResponses);

    currentQuestionIndex++;
    console.log("➡ Moving to Next Question. New Index:", currentQuestionIndex);

    saveProgress(); // ✅ Save progress before moving forward
    loadQuestion();
}


    // 📌 Back Button Functionality
    function goBack() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            loadQuestion();
        }
    }

   // 📌 Calculate Results & Save to sessionStorage
function calculateResults() {
    console.log("📊 Calculating Results...");
    console.log("🔍 User Responses:", userResponses);

    let archetypeScores = {};

    // ✅ Process weighted scoring
    Object.entries(userResponses).forEach(([questionId, response]) => {
        let question = quizQuestions.find(q => q.id === questionId);
        if (question) {
            let archetype = question.archetype;
            let weight = response.weight || 1; // Default weight is 1 if missing
            archetypeScores[archetype] = (archetypeScores[archetype] || 0) + weight;
        } else {
            console.warn("⚠️ Question ID Not Found in Quiz Data:", questionId);
        }
    });

    let sortedArchetypes = Object.keys(archetypeScores).sort((a, b) => archetypeScores[b] - archetypeScores[a]);

    console.log("🏆 Final Archetypes:", sortedArchetypes);

    // 🚨 If no valid archetypes found, redirect to quiz start
    if (sortedArchetypes.length === 0) {
        console.error("❌ No valid results found. Redirecting to quiz.");
        window.location.href = "index.html";
        return;
    }

    sessionStorage.setItem("quizResults", JSON.stringify(sortedArchetypes));
    console.log("✅ Quiz Results Saved:", sessionStorage.getItem("quizResults"));

    window.location.href = "quiz_results.html";
}
    
    
    // ✅ Save results to sessionStorage
    sessionStorage.setItem("quizResults", JSON.stringify(sortedArchetypes));
    window.location.href = "quiz_results.html"; // Redirect to results page
}


    // Process weighted scoring
    Object.entries(userResponses).forEach(([questionId, response]) => {
        let question = quizQuestions.find(q => q.id === questionId);
        if (question) {
            let archetype = question.archetype;
            let weight = response.weight || 1; // Default weight is 1 if missing
            archetypeScores[archetype] = (archetypeScores[archetype] || 0) + weight;
        } else {
            console.warn("⚠️ Question ID Not Found in Quiz Data:", questionId);
        }
    });

    let sortedArchetypes = Object.keys(archetypeScores).sort((a, b) => archetypeScores[b] - archetypeScores[a]);

    console.log("🏆 Final Archetypes:", sortedArchetypes);

    // ✅ FIX: Store final results properly before navigating
    sessionStorage.setItem("quizResults", JSON.stringify(sortedArchetypes));
    console.log("💾 Results Saved:", sessionStorage.getItem("quizResults"));

    window.location.href = "quiz_results.html";
}

    // 📌 Display Results
    function displayResults(sortedArchetypes) {
        sessionStorage.setItem("quizResults", JSON.stringify(sortedArchetypes));
        window.location.href = "quiz_results.html";
    }

    // 📌 Event Listeners
  document.addEventListener("DOMContentLoaded", () => {
    console.log("📌 DOM Fully Loaded!");

    const startButton = document.getElementById("start-button");
    if (startButton) {
        console.log("🚀 Start Button Found!");
        startButton.addEventListener("click", () => {
            console.log("🚀 Start Button Clicked! Attempting to load first question...");
            document.getElementById("intro-container").style.display = "none"; // Hide Intro
            document.getElementById("quiz-container").style.display = "block"; // Show Quiz
            loadQuestion();
        });
    } else {
        console.error("❌ Start Button Not Found!");
    }
});

<script>
document.addEventListener("DOMContentLoaded", function() {
    console.log("📌 Results Page Loaded!");

    const primaryArchetypeElement = document.getElementById("primary-archetype");
    const secondaryArchetypeElement = document.getElementById("secondary-archetype");
    const archetypeDescriptionElement = document.getElementById("archetype-description");
    const affirmingMessageElement = document.getElementById("affirming-message");
    const personalizedInsightsElement = document.getElementById("personalized-insights");
    const reflectionListElement = document.getElementById("reflection-list");

    // 🔍 Retrieve saved results from sessionStorage
    const savedResults = sessionStorage.getItem("quizResults");

    if (!savedResults || savedResults === "undefined") {
        console.error("❌ Error: No quiz results found. Redirecting to quiz.");
        window.location.href = "index.html";
        return;
    }

    const archetypes = JSON.parse(savedResults);
    console.log("🏆 Retrieved Quiz Results:", archetypes);

    if (!archetypes || archetypes.length === 0) {
        console.error("⚠️ No valid archetype found.");
        primaryArchetypeElement.innerText = "Error: No Results Found";
        return;
    }

    primaryArchetypeElement.innerText = archetypes[0] || "Unknown";
    secondaryArchetypeElement.innerText = archetypes[1] || "None";

    // ✅ Fetch additional details based on the results
    fetch("quiz_data.json")
        .then(response => response.json())
        .then(data => {
            console.log("✅ Archetype Data Loaded:", data.archetypes);
            const archetypeDetails = data.archetypes[archetypes[0]];

            if (archetypeDetails) {
                archetypeDescriptionElement.innerText = archetypeDetails.description || "No description available.";
                affirmingMessageElement.innerText = archetypeDetails.affirmation || "You are uniquely powerful!";
                personalizedInsightsElement.innerText = archetypeDetails.insights || "Explore your strengths!";

                // ✅ Load Reflection Questions
                reflectionListElement.innerHTML = "";
                if (archetypeDetails.reflection) {
                    archetypeDetails.reflection.forEach(question => {
                        let li = document.createElement("li");
                        li.innerText = question;
                        reflectionListElement.appendChild(li);
                    });
                }
            } else {
                console.warn("⚠️ Archetype details not found in JSON.");
            }
        })
        .catch(error => console.error("❌ Error loading archetype details:", error));
});
</script>

