// Results Analysis and Processing
function analyzeQuizResults(userResponses) {
    let archetypeScores = {};

    // Count the responses per archetype
    userResponses.forEach(response => {
        archetypeScores[response] = (archetypeScores[response] || 0) + 1;
    });

    // Determine primary and secondary archetypes
    let sortedArchetypes = Object.keys(archetypeScores).sort((a, b) => archetypeScores[b] - archetypeScores[a]);
    let primaryArchetype = sortedArchetypes[0];
    let secondaryArchetypes = sortedArchetypes.slice(1, 3); // Select top two secondary archetypes

    // Generate affirming message based on primary archetype
    const affirmingMessages = {
        "Catalyst": "Your creative thinking rewards not only your future but the futures of others.",
        "Explorer": "Curiosity is the urge to grow, focused in the unknown.",
        "Keystone": "Healing and helping is balancing someone else’s heart on top of yours.",
        "Vanguard": "Courage comes from the love of novelty and the strength of learning.",
        "Advocate": "Shout your love from the rooftops when that love is for community.",
        "Connoisseur": "Richness can be found in your life whether through flavor, style, or radical love.",
        "Oracle": "You are a mirror to the beauty in others, and it shines brightly in your life.",
        "Alchemist": "Chemistry, spirituality, and love are all found in people."
    };

    // Generate personalized insights
    let personalizedInsights = `As a ${primaryArchetype}, your strengths include ${getStrengths(primaryArchetype)}. Your influence as a ${secondaryArchetypes.join(" and ")} enhances your dynamic approach to experiences.`;

    // Generate reflection questions
    let reflectionQuestions = generateReflectionQuestions(primaryArchetype, secondaryArchetypes);

    // Store results in local storage
    let results = {
        primaryArchetype: primaryArchetype,
        secondaryArchetypes: secondaryArchetypes,
        descriptions: getArchetypeDescriptions(),
        affirmingMessage: affirmingMessages[primaryArchetype] || "You have a unique and compelling way of engaging with the world.",
        personalizedInsights: personalizedInsights,
        reflectionQuestions: reflectionQuestions
    };

    localStorage.setItem("quizResults", JSON.stringify(results));

    return results;
}

// Function to return archetype-specific strengths
function getStrengths(archetype) {
    const strengths = {
        "Catalyst": "innovation, adaptability, and visionary leadership",
        "Explorer": "adventurous spirit, curiosity, and thrill-seeking",
        "Keystone": "emotional intelligence, dependability, and leadership",
        "Vanguard": "bravery, strategic thinking, and bold decision-making",
        "Advocate": "compassion, activism, and dedication to justice",
        "Connoisseur": "aesthetic appreciation, refinement, and passion",
        "Oracle": "wisdom, introspection, and deep understanding",
        "Alchemist": "transformation, intuition, and unconventional thinking"
    };
    return strengths[archetype] || "a dynamic and insightful perspective.";
}

// Function to generate reflection questions based on archetypes
function generateReflectionQuestions(primary, secondary) {
    let questions = [
        `How does being a ${primary} influence your relationships?`,
        `What strengths do you gain from your secondary archetypes: ${secondary.join(" and ")}?`,
        `How do you balance personal growth with interpersonal connections?`
    ];
    return questions;
}

// Function to return archetype descriptions
function getArchetypeDescriptions() {
    return {
        "Catalyst": "A visionary and innovator who seeks to inspire change and create new pathways.",
        "Explorer": "An adventurer who thrives on discovery and seeks out new experiences.",
        "Keystone": "A grounding force, offering stability and guidance to those around them.",
        "Vanguard": "A bold leader, always ready to take on challenges and forge ahead.",
        "Advocate": "A champion for justice, using their voice to uplift and empower.",
        "Connoisseur": "A lover of depth and refinement, appreciating the finer aspects of life.",
        "Oracle": "A deep thinker, finding meaning in patterns and personal insights.",
        "Alchemist": "A transformative presence, blending intuition, intellect, and creativity."
    };
}
