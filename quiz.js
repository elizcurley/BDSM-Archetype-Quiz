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
        
        userResponses[questionId] = { selectedOption: index, weight: weight };
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
        console.log("📊 Calculating Results...");
        let archetypeScores = {};

        Object.entries(userResponses).forEach(([questionId, response]) => {
            let question = quizQuestions.find(q => q.id === questionId);
            if (question) {
                let archetype = question.archetype;
                let weight = response.weight || 1;
                archetypeScores[archetype] = (archetypeScores[archetype] || 0) + weight;
            } else {
                console.warn("⚠️ Question ID Not Found in Quiz Data:", questionId);
            }
        });

        let sortedArchetypes = Object.keys(archetypeScores).sort((a, b) => archetypeScores[b] - archetypeScores[a]);

        console.log("🏆 Final Archetypes:", sortedArchetypes);
        displayResults(sortedArchetypes);
    }

    // 📌 Display Results
    function displayResults(sortedArchetypes) {
        sessionStorage.setItem("quizResults", JSON.stringify(sortedArchetypes));
        window.location.href = "quiz_results.html";
    }

    // 📌 Event Listeners
    document.addEventListener("DOMContentLoaded", () => {
        console.log("📌 DOM Fully Loaded!");
        
        if (startButton) {
            console.log("🚀 Start Button Found!");
            startButton.addEventListener("click", startQuiz);
        } else {
            console.error("❌ Start Button Not Found!");
        }
    });

    backButton.addEventListener("click", goBack);
}
