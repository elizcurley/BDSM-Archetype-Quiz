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
    const questionContainer = document.getElementById("quiz-container");
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

    // 📌 Save Quiz Progress
    function saveProgress() {
        sessionStorage.setItem("quizProgress", JSON.stringify({
            currentQuestionIndex,
            userResponses
        }));
        console.log("💾 Progress Saved:", sessionStorage.getItem("quizProgress"));
    }

    // 📌 Load Quiz Progress
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

        if (!currentQuestion) {
            console.error("❌ Current Question is Undefined!");
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
        saveProgress();
    }

  // 📌 Select Option (Stores Response & Moves to Next)
function selectOption(index, questionId, weight) {
    console.log("👉 Option Selected:", index, "for Question:", questionId, "Weight:", weight);

    // ✅ Ensure userResponses object is correctly updated
    userResponses[questionId] = {
        selectedOption: index,
        weight: weight
    };

    console.log("🔄 Updated User Responses:", userResponses); // Debugging log

    // ✅ Move to the next question
    currentQuestionIndex++;

    // ✅ Check if there are more questions before moving to results
    if (currentQuestionIndex < quizQuestions.length) {
        saveProgress(); // ✅ Make sure progress is saved before moving forward
        loadQuestion();
    } else {
        console.log("✅ All Questions Answered – Calculating Results!");
        calculateResults();
    }
}


    // 📌 Back Button
    function goBack() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            loadQuestion();
        }
    }

    // 📌 Calculate Results
 // 📌 Calculate Results (Weight-Based)
function calculateResults() {
    console.log("📊 Calculating Results...");
    console.log("🔍 User Responses:", userResponses);

    let archetypeScores = {};

    // ✅ Ensure userResponses is not empty before proceeding
    if (Object.keys(userResponses).length === 0) {
        console.error("❌ No valid responses found. Retaking quiz...");
        sessionStorage.setItem("quizResults", JSON.stringify(["Undefined"]));
        window.location.href = "quiz_results.html";
        return;
    }

    // ✅ Process weighted scoring
    Object.entries(userResponses).forEach(([questionId, response]) => {
        let question = quizQuestions.find(q => q.id === questionId);
        if (question && question.archetype) {
            let archetype = question.archetype; 
            let weight = response.weight || 1; 
            archetypeScores[archetype] = (archetypeScores[archetype] || 0) + weight;
        } else {
            console.warn("⚠️ Question ID Not Found in Quiz Data:", questionId);
        }
    });

    let sortedArchetypes = Object.keys(archetypeScores).sort((a, b) => archetypeScores[b] - archetypeScores[a]);

    console.log("🏆 Final Archetypes:", sortedArchetypes);

    // ✅ Ensure results are correctly stored
    if (sortedArchetypes.length === 0) {
        console.error("❌ No valid archetypes determined. Storing fallback value.");
        sessionStorage.setItem("quizResults", JSON.stringify(["Undefined"]));
    } else {
        sessionStorage.setItem("quizResults", JSON.stringify(sortedArchetypes));
    }

    // ✅ Redirect to results page
    window.location.href = "quiz_results.html";
}

    // ✅ Make sure results are properly stored
    if (sortedArchetypes.length === 0) {
        console.error("❌ No valid archetypes determined. Storing fallback value.");
        sessionStorage.setItem("quizResults", JSON.stringify(["undefined"]));
    } else {
        sessionStorage.setItem("quizResults", JSON.stringify(sortedArchetypes));
    }

    // ✅ Redirect to results page
    window.location.href = "quiz_results.html";
}


    // ✅ Ensure userResponses is not empty before processing
    if (Object.keys(userResponses).length === 0) {
        console.error("❌ No user responses found – cannot calculate results.");
        return;
    }

    // ✅ Process responses and calculate weighted scores
    Object.entries(userResponses).forEach(([questionId, response]) => {
        if (response && response.weight) { 
            let weight = response.weight || 1; 
            let archetype = response.archetype || "Undefined"; 
            archetypeScores[archetype] = (archetypeScores[archetype] || 0) + weight;
        } else {
            console.warn(`⚠️ Missing data for question: ${questionId}`);
        }
    });

    // ✅ Sort archetypes based on highest score
    let sortedArchetypes = Object.keys(archetypeScores).sort((a, b) => archetypeScores[b] - archetypeScores[a]);

    if (sortedArchetypes.length === 0) {
        console.error("❌ No valid archetypes found.");
        return;
    }

    console.log("🏆 Final Archetypes:", sortedArchetypes);

    // ✅ Store results safely in sessionStorage
    sessionStorage.setItem("quizResults", JSON.stringify(sortedArchetypes));

    // ✅ Redirect to results page
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
                console.log("🚀 Start Button Clicked!");
                document.getElementById("quiz-container").style.display = "block";
                document.getElementById("intro-container").style.display = "none";
                loadQuestion();
            });
        } else {
            console.error("❌ Start Button Not Found!");
        }
    });

    nextButton.addEventListener("click", loadQuestion);
    backButton.addEventListener("click", goBack);
} // ✅ THIS is the correct ending brace (closes the `if` block)
