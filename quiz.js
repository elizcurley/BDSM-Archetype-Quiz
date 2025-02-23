/* quiz.js */

// Prevent Duplicate Script Execution
if (window.quizLoaded) {
  console.warn("⚠️ Quiz.js already loaded – Skipping duplicate execution.");
} else {
  window.quizLoaded = true; // Mark script as loaded

  // Quiz State Variables
  let quizQuestions = [];
  let currentQuestionIndex = 0;
  let userResponses = {};
  let sectionsLoaded = 0; // Tracks number of loaded sections

  // JSON Files to Load (Modular)
  const jsonFiles = [
    "quiz_sections/foundational_assessment.json",
    "quiz_sections/hobby_preferences.json",
    "quiz_sections/kink_general.json",
    "quiz_sections/kink_specific.json",
    "quiz_sections/situational.json",
    "quiz_sections/reflection.json",
    "quiz_sections/preference_strength.json"
  ];

  // DOM Elements
  const introContainer = document.getElementById("intro-container");
  const quizContainer = document.getElementById("quiz-container");
  const questionText = document.getElementById("question-text");
  const optionsContainer = document.getElementById("options-container");
  const nextButton = document.getElementById("next-button");
  const backButton = document.getElementById("back-button");

  console.log("✅ quiz.js Loaded Successfully!");

  // Load Quiz Data from All Sections
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

  // Shuffle Questions for Variation
  function shuffleQuestions() {
    quizQuestions.sort(() => Math.random() - 0.5);
  }

  // Save Progress to sessionStorage
  function saveProgress() {
    sessionStorage.setItem("quizProgress", JSON.stringify({
      currentQuestionIndex,
      userResponses
    }));
    console.log("💾 Progress Saved:", sessionStorage.getItem("quizProgress"));
  }

  // Load Progress from sessionStorage
  function loadProgress() {
    const savedProgress = JSON.parse(sessionStorage.getItem("quizProgress"));
    if (savedProgress) {
      currentQuestionIndex = savedProgress.currentQuestionIndex || 0;
      userResponses = savedProgress.userResponses || {};
      console.log("🔄 Loaded Saved Progress:", savedProgress);
    }
  }

  // Consolidated Load Question Function
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
    optionsContainer.innerHTML = "";

    // Handle numeric_scale questions by rendering a slider
    if (currentQuestion.type === "numeric_scale") {
      const input = document.createElement("input");
      input.type = "range";
      input.id = "numeric-scale-input";
      input.min = currentQuestion.min || 1;
      input.max = currentQuestion.max || 10;
      const minVal = Number(input.min);
      const maxVal = Number(input.max);
      input.value = Math.floor((minVal + maxVal) / 2);
      
      // Display current value
      const output = document.createElement("span");
      output.id = "numeric-scale-output";
      output.innerText = input.value;
      input.addEventListener("input", () => {
        output.innerText = input.value;
      });
      optionsContainer.appendChild(input);
      optionsContainer.appendChild(output);
    }
    // Optionally handle open-ended questions (if any remain)
    else if (currentQuestion.type === "open_ended") {
      const textBox = document.createElement("textarea");
      textBox.id = "open-ended-response";
      textBox.placeholder = "Type your response here...";
      textBox.classList.add("open-ended-input");
      if (userResponses[currentQuestion.id]) {
        textBox.value = userResponses[currentQuestion.id];
      }
      optionsContainer.appendChild(textBox);
    }
    // Handle closed-ended questions (e.g., likert_scale, multiple_choice)
    else if (Array.isArray(currentQuestion.response_options)) {
      currentQuestion.response_options.forEach((option, index) => {
        const button = document.createElement("button");
        button.innerText = option;
        button.classList.add("option-button");
        // Pass the archetype to the selectOption function
        button.onclick = () => selectOption(index, currentQuestion.id, currentQuestion.weight, currentQuestion.archetype);
        optionsContainer.appendChild(button);
      });
    } else {
      console.error("⚠️ Missing response options for question:", currentQuestion);
      questionText.innerText = "An error occurred displaying this question.";
    }

    backButton.style.display = currentQuestionIndex > 0 ? "block" : "none";
    saveProgress();
  }

  // Select Option Function for closed-ended choices
  function selectOption(index, questionId, weight, archetype) {
    console.log("👉 Option Selected:", index, "for Question:", questionId, "Weight:", weight, "Archetype:", archetype);
    // Store response using question ID as key
    userResponses[questionId] = {
      selectedOption: index,
      weight: weight,
      archetype: archetype
    };
    currentQuestionIndex++;
    saveProgress();
    loadQuestion();
  }

  // Back Button Functionality
  function goBack() {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      loadQuestion();
    }
  }

  // Calculate Results Function
  function calculateResults() {
    console.log("📊 Calculating Results...");
    console.log("🔍 User Responses:", userResponses);

    let archetypeScores = {};

    Object.entries(userResponses).forEach(([questionId, response]) => {
      let question = quizQuestions.find(q => q.id === questionId);
      if (!question) {
        console.warn("⚠️ Question ID Not Found in Quiz Data:", questionId);
        return;
      }
      let archetype = question.archetype;
      let weight = response.weight || 1;
      archetypeScores[archetype] = (archetypeScores[archetype] || 0) + weight;
    });

    let sortedArchetypes = Object.keys(archetypeScores).sort((a, b) => archetypeScores[b] - archetypeScores[a]);
    console.log("🏆 Final Archetypes:", sortedArchetypes);

    sessionStorage.setItem("quizResults", JSON.stringify(sortedArchetypes));
    sessionStorage.setItem("openEndedResponses", JSON.stringify(userResponses));

    window.location.href = "quiz_results.html";
  }

  // Event Listeners
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

  // Next Button: For numeric_scale and open_ended questions
  nextButton.addEventListener("click", () => {
    const currentQuestion = quizQuestions[currentQuestionIndex];
    if (currentQuestion) {
      if (currentQuestion.type === "numeric_scale") {
        const input = document.getElementById("numeric-scale-input");
        if (input) {
          userResponses[currentQuestion.id] = {
            value: input.value,
            weight: currentQuestion.weight,
            archetype: currentQuestion.archetype
          };
        }
      } else if (currentQuestion.type === "open_ended") {
        const textBox = document.getElementById("open-ended-response");
        if (textBox) {
          userResponses[currentQuestion.id] = textBox.value;
        }
      }
    }
    currentQuestionIndex++;
    saveProgress();
    loadQuestion();
  });

  backButton.addEventListener("click", goBack);
}
