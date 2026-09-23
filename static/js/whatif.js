// =============================================================================
// GlucoGuard — whatif.js
// Interactive Risk Simulator — uses REAL model predictions (no fake boost)
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
  const ageSlider = document.getElementById("sim_age");
  const weightSlider = document.getElementById("sim_weight");
  const insulinSlider = document.getElementById("sim_insulin");

  const ageValue = document.getElementById("ageVal");
  const weightValue = document.getElementById("weightVal");
  const insulinValue = document.getElementById("insulinVal");

  const canvas = document.getElementById("riskChart");
  if (!canvas || !ageSlider || !weightSlider || !insulinSlider) return;

  const ctx = canvas.getContext("2d");

  // Debounce helper
  let debounceTimer = null;
  function debounce(fn, delay = 300) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, delay);
  }

  // Create gradient for the fill
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, "rgba(0, 212, 255, 0.3)");
  gradient.addColorStop(1, "rgba(0, 212, 255, 0.02)");

  // Create Chart.js chart with dark theme
  const riskChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Diabetes Risk",
        data: [],
        borderColor: "#00d4ff",
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#00d4ff",
        pointBorderColor: "#0a0e27",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 400,
        easing: "easeOutQuart"
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 1,
          ticks: {
            color: "rgba(255, 255, 255, 0.5)",
            callback: (value) => (value * 100) + "%",
            stepSize: 0.2
          },
          grid: {
            color: "rgba(255, 255, 255, 0.05)"
          },
          title: {
            display: true,
            text: "Risk Probability",
            color: "rgba(255, 255, 255, 0.6)",
            font: { family: "Inter", size: 12 }
          }
        },
        x: {
          ticks: {
            color: "rgba(255, 255, 255, 0.4)",
            maxRotation: 0,
            maxTicksLimit: 8
          },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(10, 14, 39, 0.9)",
          titleColor: "#00d4ff",
          bodyColor: "#f8f9fa",
          borderColor: "rgba(0, 212, 255, 0.3)",
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: (context) => {
              const pct = (context.raw * 100).toFixed(1);
              let level = "Low";
              if (context.raw >= 0.6) level = "High";
              else if (context.raw >= 0.3) level = "Moderate";
              return `Risk: ${pct}% (${level})`;
            }
          }
        }
      }
    }
  });

  // Fetch prediction from backend — NO artificial boosting
  async function updateRiskChart() {
    if (ageValue) ageValue.textContent = ageSlider.value;
    if (weightValue) weightValue.textContent = weightSlider.value;
    if (insulinValue) insulinValue.textContent = insulinSlider.value;

    try {
      const weight = parseFloat(weightSlider.value);
      const bmi = (weight / (1.75 * 1.75)).toFixed(1); // assume height = 1.75m

      const response = await fetch("/whatif_predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Age: ageSlider.value,
          BMI: bmi,
          Insulin: insulinSlider.value
        })
      });

      const result = await response.json();

      if (result.probability !== undefined) {
        const prob = result.probability; // Use RAW probability — no boost

        const timestamp = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });

        // Add data point
        riskChart.data.labels.push(timestamp);
        riskChart.data.datasets[0].data.push(prob);

        // Keep only last 15 points
        if (riskChart.data.labels.length > 15) {
          riskChart.data.labels.shift();
          riskChart.data.datasets[0].data.shift();
        }

        // Update line color based on latest risk level
        const color = prob >= 0.6 ? "#ef233c" : prob >= 0.3 ? "#ffb703" : "#00f5d4";
        riskChart.data.datasets[0].borderColor = color;
        riskChart.data.datasets[0].pointBackgroundColor = color;

        riskChart.update();
      }
    } catch (err) {
      console.error("Error fetching risk data:", err);
    }
  }

  // Debounced event listeners
  ageSlider.addEventListener("input", () => {
    if (ageValue) ageValue.textContent = ageSlider.value;
    debounce(updateRiskChart);
  });
  weightSlider.addEventListener("input", () => {
    if (weightValue) weightValue.textContent = weightSlider.value;
    debounce(updateRiskChart);
  });
  insulinSlider.addEventListener("input", () => {
    if (insulinValue) insulinValue.textContent = insulinSlider.value;
    debounce(updateRiskChart);
  });

  // Initial chart load
  updateRiskChart();
});
