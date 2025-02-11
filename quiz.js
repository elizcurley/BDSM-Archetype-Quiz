// 📌 Prevent Duplicate Script Execution
if (window.quizLoaded) {
    console.warn("⚠️ Quiz.js already loaded – Skipping duplicate execution.");
} else {
    window.quizLoaded = true; // ✅ Mark script as loaded

    // 📌 Quiz State Variables
    let quizQuestions = []; // Only stores currently loaded section
    let allSections = ["foundational_assessment", "hobby_preferences", "kink_general", "kink_specific", "situational", "reflection", "preference_strength"];
    let currentSectionIndex = 0; // Tracks progress through sections
    let currentQuestionIndex = 0; // Tracks question index within a section
    let userResponses = {};

    // 📌 DOM Elements
    const introContainer = document.getElementById("intro-container");
    const quizContainer = document.getElementById("quiz-container");
    const questionText = document.getElementById("question-text");
    const optionsContainer = document.getElementById("options-container");
    const nextButton = document.getElementById("next-button");
    const backButton = document.getElementById("back-button");

    // 📌 Confirm Script is Running
    console.log("✅ quiz.js Loaded Successfully!");

    // 📌 Load First Section of Questions
    function loadNextSection() {
        if (currentSectionIndex >= allSections.length) {
            console.log("✅ All Sections Completed – Calculating Results!");
            calculateResults();
            return;
        }

        let sectionName = allSections[currentSectionIndex];
        console.log(`📌 Loading Section: ${sectionName}`);

        fetch(`quiz_sections/${sectionName}.json`) // ✅ Lazy loading JSON
            .then(response => response.json())
            .then(data => {
                quizQuestions = data.questions || []; // ✅ Load only current section
                currentQuestionIndex = 0; // ✅ Reset index for new section
                loadQuestion();
            })
            .catch(error => console.error(`❌ Error loading ${sectionName}:`, error));
    }

    // 📌 Save Quiz Progress to Session Storage
    function saveProgress() {
        sessionStorage.setItem("quizProgress", JSON.stringify({ 
            currentSectionIndex,
            currentQuestionIndex, 
            userResponses 
        }));
        console.log("💾 Progress Saved:", sessionStorage.getItem("quizProgress"));
    }

    // 📌 Load Quiz Progress from Session Storage
    function loadProgress() {
        const savedProgress = JSON.parse(sessionStorage.getItem("quizProgress"));
        if (savedProgress) {
            currentSectionIndex = savedProgress.currentSectionIndex || 0;
            currentQuestionIndex = savedProgress.currentQuestionIndex || 0;
            userResponses = savedProgress.userResponses || {};
            console.log("🔄 Loaded Saved Progress:", savedProgress);
        }
    }

    // 📌 Load Question (Dynamically Updates UI)
    function loadQuestion() {
        console.log("📌 Loading Question Index:", currentQuestionIndex);

        if (quizQuestions.length === 0) {
            console.log("✅ Section Completed! Moving to Next Section.");
            currentSectionIndex++;
            loadNextSection();
            return;
        }

        if (currentQuestionIndex >= quizQuestions.length) {
            console.log("✅ Section Completed! Moving to Next Section.");
            currentSectionIndex++;
            loadNextSection();
            return;
        }

        const currentQuestion = quizQuestions[currentQuestionIndex];
        console.log("🎯 Current Question:", currentQuestion);

        if (!currentQuestion) {
            console.error("❌ Current Question is Undefined! Check JSON format.");
            return;
        }

        // ✅ Show Quiz and Hide Intro
        introContainer.style.display = "none";
        quizContainer.style.display = "block";

        questionText.innerText = currentQuestion.question_text;
        optionsContainer.innerHTML = "";

        currentQuestion.response_options.forEach((option, index) => {
            const button = document.createElement("button");
            button.innerText = option;
            button.classList.add("option-button");
            button.onclick = () => selectOption(index, currentQuestion.id, currentQuestion.weight, currentQuestion.archetype);
            optionsContainer.appendChild(button);
        });

        backButton.style.display = currentQuestionIndex > 0 ? "block" : "none";
        saveProgress();
    }

    // 📌 Select Option (Stores Response & Moves to Next)
    function selectOption(index, questionId, weight, archetype) {
        console.log("👉 Option Selected:", index, "for Question:", questionId, "Weight:", weight, "Archetype:", archetype);

        if (!userResponses[archetype]) {
            userResponses[archetype] = 0;
        }
        userResponses[archetype] += weight;

        currentQuestionIndex++;
        console.log("➡ Moving to Next Question. New Index:", currentQuestionIndex);
        saveProgress();

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

        let sortedArchetypes = Object.keys(userResponses).sort((a, b) => userResponses[b] - userResponses[a]);

        console.log("🏆 Final Archetypes:", sortedArchetypes);
        displayResults(sortedArchetypes);
    }

    // 📌 Display Results (Navigates to results page)
    function displayResults(sortedArchetypes) {
        sessionStorage.setItem("quizResults", JSON.stringify(sortedArchetypes));
        window.location.href = "quiz_results.html";
    }

    // 📌 Event Listeners for Start Button
    document.addEventListener("DOMContentLoaded", () => {
        console.log("📌 DOM Fully Loaded!");

        const startButton = document.getElementById("start-button");
        if (startButton) {
            console.log("🚀 Start Button Found!");
            startButton.addEventListener("click", () => {
                console.log("🚀 Start Button Clicked! Loading first section...");
                loadNextSection();
            });
        } else {
            console.error("❌ Start Button Not Found!");
        }
    });

    // 📌 Event Listeners for Next & Back Buttons
    nextButton.addEventListener("click", loadQuestion);
    backButton.addEventListener("click", goBack);
}
