// 📌 Quiz State Variables
let quizQuestions = [];
let currentQuestionIndex = 0;
let userResponses = {};

// 📌 DOM Elements
const questionContainer = document.getElementById("question-container");
const questionText = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");
const nextButton = document.getElementById("next-button");
const backButton = document.getElementById("back-button");
const resultsContainer = document.getElementById("results-container");

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
    loadQuestion();
  })
  .catch(error => console.error("❌ Error loading JSON:", error));

// 📌 Save Quiz Progress to Session Storage
function saveProgress() {
    sessionStorage.setItem("quizProgress", JSON.stringify({ 
        currentQuestionIndex, 
        userResponses 
    }));
    console.log("💾 Progress Saved:", sessionStorage.getItem("quizProgress"));
}

// 📌 Load Quiz Progress from Session Storage
function loadProgress() {
    const savedProgress = JSON.parse(sessionStorage.getItem("quizProgress"));
    if (savedProgress) {
        currentQuestionIndex = savedProgress.currentQuestionIndex || 0;
        userResponses = savedProgress.userResponses || {};
        console.log("🔄 Loaded Saved Progress:", savedProgress);
    }
}

// 📌 Load Question (Dynamically Updates UI)
function loadQuestion() {
    console.log("📌 Loading Question Index:", currentQuestionIndex);
    
    if (quizQuestions.length === 0) {
        console.error("❌ No Questions Found in JSON!");
        return;
    }

    if (currentQuestionIndex >= quizQuestions.length) {
        console.log("✅ All Questions Answered – Calculating Results!");
        calculateResults();
        return;
    }

    const currentQuestion = quizQuestions[currentQuestionIndex];
    console.log("🎯 Current Question:", currentQuestion);

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
    saveProgress();
}

// 📌 Select Option (Stores Response & Moves to Next)
function selectOption(index, questionId, weight) {
    console.log("👉 Option Selected:", index, "for Question:", questionId, "Weight:", weight);

    userResponses[questionId] = { selectedOption: index, weight: weight };
    currentQuestionIndex++;
    console.log("➡ Moving to Next Question. New Index:", currentQuestionIndex);
    
    loadQuestion();
}

// 📌 Back Button Functionality
function goBack() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
    }
}

// 📌 Calculate Results (Weight-Based)
function calculateResults() {
    console.log("📊 Calculating Results...");
    console.log("🔍 User Responses:", userResponses);

    let archetypeScores = {};

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
    displayResults(sortedArchetypes);
}

// 📌 Display Results (Navigates to results page)
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
            console.log("🚀 Start Button Clicked!");
            loadQuestion();
        });
    } else {
        console.error("❌ Start Button Not Found!");
    }
});

nextButton.addEventListener("click", loadQuestion);
backButton.addEventListener("click", goBack);
