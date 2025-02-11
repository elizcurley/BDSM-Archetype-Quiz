// 📌 Prevent Duplicate Script Execution
if (window.quizLoaded) {
    console.warn("⚠️ Quiz.js already loaded – Skipping duplicate execution.");
} else {
    window.quizLoaded = true; // ✅ Mark script as loaded

    // 📌 Quiz State Variables
    let quizQuestions = [];
    let currentQuestionIndex = 0;
    let userResponses = {};

    // 📌 DOM Elements
    const introContainer = document.getElementById("intro-container"); // ✅ Landing Page
    const startButton = document.getElementById("start-button");
    const quizContainer = document.getElementById("quiz-container");
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

          // ✅ Assign quizQuestions Correctly
          quizQuestions = data.sections.foundational_assessment.questions;
          console.log("📌 Extracted Questions:", quizQuestions);
      })
      .catch(error => console.error("❌ Error loading JSON:", error));

    // 📌 Start Quiz (Reveals Questions)
    startButton.addEventListener("click", () => {
        console.log("🚀 Start Button Clicked!");
        introContainer.classList.add("hidden");  // ✅ Hide the intro
        quizContainer.classList.remove("hidden"); // ✅ Show the quiz
        loadQuestion();
    });

    // 📌 Load Question
    function loadQuestion() {
        console.log("📌 Loading Question Index:", currentQuestionIndex);

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
    }

    // 📌 Select Option
    function selectOption(index, questionId, weight) {
        console.log("👉 Option Selected:", index, "for Question:", questionId, "Weight:", weight);

        userResponses[questionId] = { selectedOption: index, weight: weight };
        currentQuestionIndex++;
        console.log("➡ Moving to Next Question. New Index:", currentQuestionIndex);

        loadQuestion();
    }
}
