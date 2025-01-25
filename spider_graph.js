// Spider Graph using Chart.js
document.addEventListener("DOMContentLoaded", function () {
    const ctx = document.getElementById("spider-graph").getContext("2d");

    // Placeholder Data - Will be dynamically updated based on results
    let archetypeScores = {
        "Catalyst": 8,
        "Explorer": 7,
        "Keystone": 5,
        "Vanguard": 6,
        "Advocate": 4,
        "Connoisseur": 3,
        "Oracle": 7,
        "Alchemist": 5
    };

    let archetypeLabels = Object.keys(archetypeScores);
    let archetypeValues = Object.values(archetypeScores);

    // Chart.js Radar Chart
    new Chart(ctx, {
        type: "radar",
        data: {
            labels: archetypeLabels,
            datasets: [{
                label: "Archetype Preference Distribution",
                data: archetypeValues,
                backgroundColor: "rgba(90, 103, 216, 0.3)",
                borderColor: "#5a67d8",
                borderWidth: 2,
                pointBackgroundColor: "#5a67d8"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scale: {
                ticks: { beginAtZero: true, max: 10 },
                gridLines: { color: "rgba(0, 0, 0, 0.1)" }
            },
            legend: { display: false }
        }
    });
});
