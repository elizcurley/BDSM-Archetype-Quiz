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

// 📌 Load Quiz Data from JSON
fetch('quiz_data.json')
  .then(response => response.json())
  .then(data => {
    console.log("Quiz Data Loaded:", data);
    quizQuestions = data.sections.foundational_assessment.questions; // Adjust based on how JSON is structured
    loadProgress(); // Load stored progress
    loadQuestion();
  })
  .catch(error => console.error("Error loading quiz data:", error));

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

// 📌 Load Question
function loadQuestion() {
    if (currentQuestionIndex >= quizQuestions.length) {
        calculateResults();
        return;
    }

    const currentQuestion = quizQuestions[currentQuestionIndex];
    questionText.innerText = currentQuestion.question_text;
    optionsContainer.innerHTML = "";

    currentQuestion.response_options.forEach((option, index) => {
        const button = document.createElement("button");
        button.innerText = option;
        button.classList.add("option-button");
        button.onclick = () => selectOption(index, currentQuestion.id);
        optionsContainer.appendChild(button);
    });

    backButton.style.display = currentQuestionIndex > 0 ? "block" : "none";
    saveProgress(); // Save progress after loading question
}

// 📌 Select Option
function selectOption(index, questionId) {
    userResponses[questionId] = index; // Store user answer
    currentQuestionIndex++;
    loadQuestion();
}

// 📌 Back Button Functionality
function goBack() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
    }
}

// 📌 Calculate Results
function calculateResults() {
    let archetypeScores = {};

    Object.values(userResponses).forEach(archetype => {
        archetypeScores[archetype] = (archetypeScores[archetype] || 0) + 1;
    });

    let sortedArchetypes = Object.keys(archetypeScores).sort((a, b) => archetypeScores[b] - archetypeScores[a]);

    displayResults(sortedArchetypes);
}

// 📌 Display Results
function displayResults(sortedArchetypes) {
    sessionStorage.setItem("quizResults", JSON.stringify(sortedArchetypes));
    window.location.href = "
