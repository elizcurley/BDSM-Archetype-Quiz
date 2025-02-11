// 📌 Prevent Duplicate Script Execution
if (window.quizLoaded) {
    console.warn("⚠️ Quiz.js already loaded – Skipping duplicate execution.");
} else {
    window.quizLoaded = true; // ✅ Mark script as loaded

    // 📌 Quiz State Variables
    let quizQuestions = [];
    let currentQuestionIndex = 0;
    let userResponses = {};
    let sectionsLoaded = 0; // Tracks number of loaded sections

    // 📌 JSON Files to Load (Modular)
    const jsonFiles = [
        "quiz_sections/foundational_assessment.json",
        "quiz_sections/hobby_preferences.json",
        "quiz_sections/kink_general.json",
        "quiz_sections/kink_specific.json",
        "quiz_sections/situational.json",
        "quiz_sections/reflection.json",
        "quiz_sections/preference_strength.json"
    ];

    // 📌 DOM Elements
    const introContainer = document.getElementById("intro-container");
    const quizContainer = document.getElementById("quiz-container");
    const questionText = document.getElementById("question-text");
    const optionsContainer = document.getElementById("options-container");
    const nextButton = document.getElementById("next-button");
    const backButton = document.getElementById("back-button");
    const resultsContainer = document.getElementById("results-container");

    console.log("✅ quiz.js Loaded Successfully!");

    // 📌 Load Quiz Data from All Sections
    function loadAllSections() {
        jsonFiles.forEach(file => {
            fetch(file)
                .then(response => response.json())
                .then(data => {
                    if (data.questions) {
                        quizQuestions = quizQuestions.concat(data.questions);
                        console.log(`📌 Loaded ${data.questions.length} questions from ${file}`);
                    } else {
                        console.warn(`⚠️ No questions found in ${file}`);
                    }

                    sectionsLoaded++;
                    if (sectionsLoaded === jsonFiles.length) {
                        console.log("✅ All quiz sections loaded!");
                        shuffleQuestions();
                        loadProgress();
                        loadQuestion();
                    }
                })
                .catch(error => console.error(`❌ Error loading ${file}:`, error));
        });
    }

    // 📌 Shuffle Questions for Variation
    function shuffleQuestions() {
        quizQuestions.sort(() => Math.random() - 0.5);
    }

    // 📌 Save Progress
    function saveProgress() {
        sessionStorage.setItem("quizProgress", JSON.stringify({
            currentQuestionIndex,
            userResponses
        }));
        console.log("💾 Progress Saved:", sessionStorage.getItem("quizProgress"));
    }

    // 📌 Load Progress
    function loadProgress() {
        const savedProgress = JSON.parse(sessionStorage.getItem("quizProgress"));
        if (savedProgress) {
            currentQuestionIndex = savedProgress.currentQuestionIndex || 0;
            userResponses = savedProgress.userResponses || {};
            console.log("🔄 Loaded Saved Progress:", savedProgress);
        }
    }

    // 📌 Load Question
    function loadQuestion() {
    console.log("📌 Loading Question Index:", currentQuestionIndex);

    if (!quizQuestions || quizQuestions.length === 0) {
        console.error("❌ No Questions Found! Delaying question load.");
        questionText.innerText = "Loading questions... Please wait.";
        return;
    }

    if (currentQuestionIndex >= quizQuestions.length) {
        console.log("✅ All Questions Answered – Calculating Results!");
        calculateResults();
        return;
    }

    const currentQuestion = quizQuestions[currentQuestionIndex];

    if (!currentQuestion) {
        console.error("❌ Current Question is Undefined! Skipping...");
        questionText.innerText = "An error occurred loading this question.";
        return;
    }

    console.log("🎯 Current Question:", currentQuestion);

    questionText.innerText = currentQuestion.question_text;
    optionsContainer.innerHTML = ""; // Clear previous options

    // ✅ Handle different question types:
    if (currentQuestion.type === "open_ended") {
        // Create and display a text box for open-ended input
        const textBox = document.createElement("textarea");
        textBox.id = "open-ended-response";
        textBox.placeholder = "Type your response here...";
        textBox.classList.add("open-ended-input");
        
        // Load saved input if user is revisiting a question
        if (userResponses[currentQuestion.id]) {
            textBox.value = userResponses[currentQuestion.id];
        }

        optionsContainer.appendChild(textBox);
    } else {
        // Render multiple-choice buttons (for likert scale, multiple choice, etc.)
        currentQuestion.response_options.forEach((option, index) => {
            const button = document.createElement("button");
            button.innerText = option;
            button.classList.add("option-button");
            button.onclick = () => selectOption(index, currentQuestion.id, currentQuestion.weight);
            optionsContainer.appendChild(button);
        });
    }

    backButton.style.display = currentQuestionIndex > 0 ? "block" : "none";
    saveProgress();
}

    // ✅ Ensure quizQuestions has loaded before displaying
    if (!quizQuestions || quizQuestions.length === 0) {
        console.error("❌ No Questions Found! Delaying question load.");
        questionText.innerText = "Loading questions... Please wait.";
        return;
    }

    if (currentQuestionIndex >= quizQuestions.length) {
        console.log("✅ All Questions Answered – Calculating Results!");
        calculateResults();
        return;
    }

    const currentQuestion = quizQuestions[currentQuestionIndex];

    // ✅ Ensure the current question is valid before displaying
    if (!currentQuestion) {
        console.error("❌ Current Question is Undefined! Skipping...");
        questionText.innerText = "An error occurred loading this question.";
        return;
    }

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

    // 📌 Select Option
    function selectOption(index, questionId, weight, archetype) {
        console.log("👉 Option Selected:", index, "for Question:", questionId, "Weight:", weight, "Archetype:", archetype);

        if (!userResponses[archetype]) {
            userResponses[archetype] = 0;
        }
        userResponses[archetype] += weight;

        currentQuestionIndex++;
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

    // 📌 Calculate Results
   function calculateResults() {
    console.log("📊 Calculating Results...");
    console.log("🔍 User Responses:", userResponses);

    let archetypeScores = {};

    // Process only multiple-choice & scale-based responses for scoring
    Object.entries(userResponses).forEach(([questionId, response]) => {
        let question = quizQuestions.find(q => q.id === questionId);

        if (!question) {
            console.warn("⚠️ Question ID Not Found in Quiz Data:", questionId);
            return;
        }

        if (question.type !== "open_ended") {
            let archetype = question.archetype;
            let weight = response.weight || 1; // Default weight is 1 if missing
            archetypeScores[archetype] = (archetypeScores[archetype] || 0) + weight;
        }
    });

    let sortedArchetypes = Object.keys(archetypeScores).sort((a, b) => archetypeScores[b] - archetypeScores[a]);

    console.log("🏆 Final Archetypes:", sortedArchetypes);
    
    // ✅ Store results
    sessionStorage.setItem("quizResults", JSON.stringify(sortedArchetypes));
    sessionStorage.setItem("openEndedResponses", JSON.stringify(userResponses)); // Store open-ended answers separately

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
                console.log("🚀 Start Button Clicked! Loading Quiz...");
                introContainer.style.display = "none";
                quizContainer.style.display = "block";
                loadAllSections();
            });
        } else {
            console.error("❌ Start Button Not Found!");
        }
    });

    nextButton.addEventListener("click", loadQuestion);
    backButton.addEventListener("click", goBack);
}
