// Quiz Data Structure
const quizQuestions = [
    {
        question: "How do you approach new experiences?",
        options: [
            { text: "With excitement and curiosity", archetype: "Explorer" },
            { text: "By analyzing and preparing first", archetype: "Keystone" },
            { text: "I challenge myself to take the lead", archetype: "Vanguard" },
            { text: "I consider how it aligns with my deeper values", archetype: "Oracle" }
        ]
    },
    {
        question: "How do you handle challenges?",
        options: [
            { text: "By innovating and trying new approaches", archetype: "Catalyst" },
            { text: "By relying on intuition and deeper wisdom", archetype: "Oracle" },
            { text: "Through discipline and perseverance", archetype: "Keystone" },
            { text: "By seeking excitement in the challenge itself", archetype: "Explorer" }
        ]
    }
];

// Quiz State Variables
let currentQuestionIndex = 0;
let userResponses = {};

// DOM Elements
const questionContainer = document.getElementById("question-container");
const questionText = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");
const nextButton = document.getElementById("next-button");
const backButton = document.getElementById("back-button");
const resultsContainer = document.getElementById("results-container");

// Load Question
function loadQuestion() {
    if (currentQuestionIndex >= quizQuestions.length) {
        calculateResults();
        return;
    }

    const currentQuestion = quizQuestions[currentQuestionIndex];
    questionText.innerText = currentQuestion.question;
    optionsContainer.innerHTML = "";

    currentQuestion.options.forEach((option, index) => {
        const button = document.createElement("button");
        button.innerText = option.text;
        button.classList.add("option-button");
        button.onclick = () => selectOption(index, option.archetype);
        optionsContainer.appendChild(button);
    });

    backButton.style.display = currentQuestionIndex > 0 ? "block" : "none";
}

// Select Option
function selectOption(index, archetype) {
    userResponses[currentQuestionIndex] = archetype;
    currentQuestionIndex++;
    loadQuestion();
}

// Back Button Functionality
function goBack() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
    }
}

// Calculate Results
function calculateResults() {
    let archetypeScores = {};

    Object.values(userResponses).forEach(archetype => {
        archetypeScores[archetype] = (archetypeScores[archetype] || 0) + 1;
    });

    let sortedArchetypes = Object.keys(archetypeScores).sort((a, b) => archetypeScores[b] - archetypeScores[a]);

    displayResults(sortedArchetypes);
}

// Display Results
function displayResults(sortedArchetypes) {
    localStorage.setItem("quizResults", JSON.stringify(sortedArchetypes));
    window.location.href = "quiz_results.html";
}

// Event Listeners
nextButton.addEventListener("click", loadQuestion);
backButton.addEventListener("click", goBack);

// Initialize Quiz
loadQuestion();
