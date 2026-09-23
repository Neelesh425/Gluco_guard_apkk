// =============================================================================
// GlucoGuard — main.js
// Handles: 3D models, prediction form, SVG gauge, charts, animations
// =============================================================================

// -------------------- DOM Ready Helper --------------------
function whenDOMReady(cb) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cb);
  } else {
    cb();
  }
}

// -------------------- Global State --------------------
let trendChart = null;
let fiChart = null;
let simChart = null;
let predictionHistory = [];

// -------------------- 3D Model Loader --------------------
async function loadPlaceholders() {
  const phs = document.querySelectorAll(".model-placeholder");
  for (const ph of phs) {
    const fname = ph.getAttribute("data-model");
    if (!fname) {
      ph.innerHTML = '<div class="loading-text">No model specified</div>';
      continue;
    }
    const url = `/static/models/${fname}`;
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (!response.ok) throw new Error("Not found");
      const mv = document.createElement("model-viewer");
      mv.setAttribute("src", url);
      mv.setAttribute("alt", fname);
      mv.setAttribute("auto-rotate", "");
      mv.setAttribute("camera-controls", "");
      mv.setAttribute("shadow-intensity", "1");
      mv.style.width = "100%";
      mv.style.height = ph.style.height || "320px";
      mv.style.borderRadius = "12px";
      ph.innerHTML = "";
      ph.appendChild(mv);
    } catch (err) {
      console.warn("3D model not loaded:", fname);
      ph.innerHTML = `<div class="loading-text" style="color:var(--text-muted)">3D model unavailable</div>`;
    }
  }
}

// -------------------- SVG Gauge --------------------
function drawGauge(probability) {
  const svg = document.getElementById("gauge");
  if (!svg) return;

  const pct = Math.max(0, Math.min(1, probability));
  const cx = 100, cy = 100, r = 80;
  const startAngle = Math.PI;
  const endAngle = 0;

  function polarToCart(angle) {
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  }

  function arcPath(start, end) {
    const s = polarToCart(start);
    const e = polarToCart(end);
    const sweep = end - start <= Math.PI ? 0 : 1;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${sweep} 1 ${e.x} ${e.y}`;
  }

  // Color based on risk
  let color;
  if (pct < 0.3) color = "#00f5d4";
  else if (pct < 0.6) color = "#ffb703";
  else color = "#ef233c";

  const valueAngle = startAngle + (endAngle - startAngle) * pct;

  svg.innerHTML = `
    <!-- Background arc -->
    <path d="${arcPath(startAngle, endAngle)}"
          fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="14"
          stroke-linecap="round"/>
    <!-- Value arc -->
    <path d="${arcPath(startAngle, valueAngle)}"
          fill="none" stroke="${color}" stroke-width="14"
          stroke-linecap="round"
          style="filter: drop-shadow(0 0 6px ${color});">
      <animate attributeName="d"
               from="${arcPath(startAngle, startAngle)}"
               to="${arcPath(startAngle, valueAngle)}"
               dur="0.8s" fill="freeze"/>
    </path>
    <!-- Center percentage -->
    <text x="${cx}" y="${cy - 10}" text-anchor="middle"
          fill="${color}" font-size="28" font-family="Outfit, sans-serif" font-weight="700">
      ${(pct * 100).toFixed(1)}%
    </text>
    <text x="${cx}" y="${cy + 15}" text-anchor="middle"
          fill="rgba(255,255,255,0.5)" font-size="11" font-family="Inter, sans-serif">
      risk score
    </text>
  `;
}

// -------------------- Animated Counter --------------------
function animateCounter(element, target, duration = 800) {
  const start = 0;
  const startTime = performance.now();
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = start + (target - start) * eased;
    element.textContent = current.toFixed(1) + "%";
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// -------------------- Prediction Form --------------------
function initPredictForm() {
  const form = document.getElementById("predictForm");
  if (!form) return;

  const probText = document.getElementById("probText");
  const categoryText = document.getElementById("categoryText");
  const resultCard = document.getElementById("resultCard");

  // Handle form reset
  form.addEventListener("reset", () => {
    setTimeout(() => {
      probText.textContent = "—";
      categoryText.textContent = "Enter your details and click Predict";
      resultCard.classList.remove("risk-low", "risk-medium", "risk-high");
      drawGauge(0);
    }, 10);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Loading state
    probText.textContent = "...";
    categoryText.textContent = "Analyzing...";

    try {
      const res = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await res.json();

      if (res.ok) {
        const prob = result.probability;
        const pct = prob * 100;

        // Animate counter
        animateCounter(probText, pct);

        // Category + color
        resultCard.classList.remove("risk-low", "risk-medium", "risk-high");
        if (prob < 0.3) {
          categoryText.textContent = "Low Risk";
          resultCard.classList.add("risk-low");
        } else if (prob < 0.6) {
          categoryText.textContent = "Moderate Risk";
          resultCard.classList.add("risk-medium");
        } else {
          categoryText.textContent = "High Risk";
          resultCard.classList.add("risk-high");
        }

        // Draw gauge
        drawGauge(prob);

        // Add to trend chart
        addTrendPoint(prob);
      } else {
        probText.textContent = "Error";
        categoryText.textContent = result.error || "Something went wrong";
      }
    } catch (err) {
      probText.textContent = "Error";
      categoryText.textContent = err.message;
    }
  });
}

// -------------------- Trend Chart (Prediction History) --------------------
function initTrendChart() {
  const canvas = document.getElementById("trendChart");
  if (!canvas) return;

  trendChart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Risk Probability",
        data: [],
        borderColor: "#00d4ff",
        backgroundColor: "rgba(0, 212, 255, 0.1)",
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#00d4ff",
        pointBorderColor: "#00d4ff",
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 1,
          ticks: {
            color: "rgba(255,255,255,0.5)",
            callback: (v) => (v * 100) + "%"
          },
          grid: { color: "rgba(255,255,255,0.05)" }
        },
        x: {
          ticks: { color: "rgba(255,255,255,0.5)", maxRotation: 0 },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => (ctx.raw * 100).toFixed(1) + "% risk"
          }
        }
      }
    }
  });
}

function addTrendPoint(probability) {
  if (!trendChart) return;
  const label = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  trendChart.data.labels.push(label);
  trendChart.data.datasets[0].data.push(probability);
  if (trendChart.data.labels.length > 12) {
    trendChart.data.labels.shift();
    trendChart.data.datasets[0].data.shift();
  }
  trendChart.update();
}

// -------------------- Feature Importance Chart --------------------
async function initFeatureImportanceChart() {
  const canvas = document.getElementById("fiChart");
  if (!canvas) return;

  try {
    const res = await fetch("/model/feature_importances");
    const data = await res.json();

    // Sort by importance descending
    data.sort((a, b) => parseFloat(b.importance) - parseFloat(a.importance));

    const labels = data.map(d => d.feature);
    const values = data.map(d => parseFloat(d.importance));

    fiChart = new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Importance",
          data: values,
          backgroundColor: values.map((_, i) => {
            const ratio = i / values.length;
            return `rgba(0, ${180 + 75 * (1 - ratio)}, ${200 + 55 * (1 - ratio)}, 0.8)`;
          }),
          borderColor: "rgba(0, 212, 255, 0.9)",
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.7
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: "rgba(255,255,255,0.5)" },
            grid: { color: "rgba(255,255,255,0.05)" }
          },
          y: {
            ticks: { color: "rgba(255,255,255,0.7)", font: { size: 12 } },
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => (ctx.raw * 100).toFixed(1) + "%"
            }
          }
        }
      }
    });
  } catch (err) {
    console.error("Failed to load feature importances:", err);
  }
}

// -------------------- Blood Sugar Simulator --------------------
function initSimulator() {
  const runBtn = document.getElementById("runSim");
  if (!runBtn) return;

  const canvas = document.getElementById("simChart");

  runBtn.addEventListener("click", () => {
    const carbs = parseFloat(document.getElementById("simCarbs").value) || 0;
    const insulin = parseFloat(document.getElementById("simInsulin").value) || 0;

    // Generate pharmacokinetic curve
    const timePoints = [];
    const glucoseValues = [];
    for (let t = 0; t <= 240; t += 5) {
      // Carb absorption peaks at ~45 min, insulin effect peaks at ~90 min
      const carbEffect = carbs * 1.5 * Math.exp(-Math.pow(t - 45, 2) / 900);
      const insulinEffect = insulin * 3 * Math.exp(-Math.pow(t - 90, 2) / 1800);
      const glucose = Math.max(40, 100 + carbEffect - insulinEffect);
      timePoints.push(t);
      glucoseValues.push(glucose);
    }

    if (simChart) simChart.destroy();

    simChart = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: timePoints.map(t => t + " min"),
        datasets: [
          {
            label: "Blood Glucose (mg/dL)",
            data: glucoseValues,
            borderColor: "#00d4ff",
            backgroundColor: "rgba(0, 212, 255, 0.1)",
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2
          },
          {
            label: "Danger Zone (180 mg/dL)",
            data: timePoints.map(() => 180),
            borderColor: "rgba(239, 35, 60, 0.5)",
            borderDash: [5, 5],
            pointRadius: 0,
            borderWidth: 1,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 40,
            max: 300,
            ticks: { color: "rgba(255,255,255,0.5)" },
            grid: { color: "rgba(255,255,255,0.05)" },
            title: { display: true, text: "mg/dL", color: "rgba(255,255,255,0.5)" }
          },
          x: {
            ticks: {
              color: "rgba(255,255,255,0.5)",
              maxTicksLimit: 10
            },
            grid: { display: false }
          }
        },
        plugins: {
          legend: {
            labels: { color: "rgba(255,255,255,0.7)", boxWidth: 12 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ctx.dataset.label + ": " + ctx.raw.toFixed(0) + " mg/dL"
            }
          }
        }
      }
    });
  });
}

// -------------------- Quick What-If Sliders --------------------
function initQuickWhatIf() {
  const sliders = [
    { id: "wf_glucose", display: "wf_value_glucose" },
    { id: "wf_bmi", display: "wf_value_bmi" },
    { id: "wf_age", display: "wf_value_age" }
  ];

  sliders.forEach(({ id, display }) => {
    const slider = document.getElementById(id);
    const span = document.getElementById(display);
    if (slider && span) {
      slider.addEventListener("input", () => {
        span.textContent = slider.value;
      });
    }
  });

  // Apply to form button
  const applyBtn = document.getElementById("wf_apply");
  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      const glucoseInput = document.getElementById("Glucose");
      const bmiInput = document.getElementById("BMI");
      const ageInput = document.getElementById("Age");
      const glucoseSlider = document.getElementById("wf_glucose");
      const bmiSlider = document.getElementById("wf_bmi");
      const ageSlider = document.getElementById("wf_age");

      if (glucoseInput && glucoseSlider) glucoseInput.value = glucoseSlider.value;
      if (bmiInput && bmiSlider) bmiInput.value = bmiSlider.value;
      if (ageInput && ageSlider) ageInput.value = ageSlider.value;

      // Scroll to form
      document.getElementById("predict")?.scrollIntoView({ behavior: "smooth" });
    });
  }
}

// -------------------- Intersection Observer (Scroll Animations) --------------------
function initScrollAnimations() {
  const sections = document.querySelectorAll(".section");
  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  sections.forEach((section) => observer.observe(section));
}

// -------------------- Smooth Scroll for Anchor Links --------------------
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const href = anchor.getAttribute("href");
      if (href === "#") return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

// -------------------- Initialize Everything --------------------
whenDOMReady(() => {
  loadPlaceholders();
  initPredictForm();
  initTrendChart();
  initFeatureImportanceChart();
  initSimulator();
  initQuickWhatIf();
  initScrollAnimations();
  initSmoothScroll();
  drawGauge(0);
});
