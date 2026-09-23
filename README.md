# 🛡️ GlucoGuard — AI Diabetes Risk Predictor

A modern, AI-powered web application that predicts the likelihood of diabetes using clinical health parameters. Built with **XGBoost** machine learning and a premium **glassmorphic UI**.

![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-3.x-lightgrey?logo=flask)
![XGBoost](https://img.shields.io/badge/ML-XGBoost-orange?logo=xgboost)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

- **🤖 XGBoost ML Model** — Trained on the Pima Indians Diabetes Dataset with 5-fold cross-validation (~79.5% AUC-ROC)
- **📊 Interactive Charts** — Feature importance bar chart, prediction history trend, and blood sugar simulator (Chart.js)
- **🔮 What-If Simulator** — Adjust Age, Weight, and Insulin sliders to see risk change in real time
- **🎯 SVG Risk Gauge** — Animated semi-circle gauge with color-coded risk levels (green → amber → red)
- **💎 Glassmorphic UI** — Dark theme with frosted glass cards, neon accents, and smooth animations
- **🧬 3D Models** — Interactive 3D visualizations using Google's `<model-viewer>`
- **📱 Fully Responsive** — Works on desktop, tablet, and mobile
- **🏃 Lifestyle Planner** — Goal-based health plans (weight loss, blood sugar, exercise)

---

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/Neelesh425/Gluco_guard_apkk.git
cd Gluco_guard_apkk

# Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run the app
python app.py
```

Open **http://127.0.0.1:5000** in your browser.

---

## 🧠 ML Model Details

| Metric | Score |
|---|---|
| Algorithm | XGBoost (Gradient Boosted Trees) |
| Dataset | Pima Indians Diabetes (768 samples, 8 features) |
| 5-Fold CV Accuracy | **73.8%** |
| 5-Fold CV AUC-ROC | **79.5%** |
| Test Set Accuracy | **75.3%** |

### Input Features

| Feature | Description | Unit |
|---|---|---|
| Pregnancies | Number of pregnancies | count |
| Glucose | Plasma glucose concentration | mg/dL |
| Blood Pressure | Diastolic blood pressure | mm Hg |
| Skin Thickness | Triceps skin fold thickness | mm |
| Insulin | 2-hour serum insulin | μU/mL |
| BMI | Body mass index | kg/m² |
| Diabetes Pedigree Function | Genetic diabetes risk score | 0.0–2.5 |
| Age | Age in years | years |

### Retrain the Model

```bash
python train_model.py
```

This downloads the dataset, trains an XGBoost pipeline, and saves artifacts to `model/`.

---

## 📁 Project Structure

```
Gluco_guard_apkk/
├── app.py                  # Flask backend (API endpoints)
├── train_model.py          # XGBoost training pipeline
├── requirements.txt        # Python dependencies
├── model/
│   ├── diabetes_pipeline.pkl       # Trained XGBoost pipeline
│   ├── dataset_stats.json          # Dataset mean/median/std
│   ├── feature_importances.csv     # Feature importance scores
│   └── metadata.json               # Model version info
├── templates/
│   ├── index.html          # Main prediction page
│   └── lifestyle.html      # Lifestyle planner page
├── static/
│   ├── css/styles.css      # Glassmorphic stylesheet
│   ├── js/main.js          # Charts, gauge, form logic
│   ├── js/whatif.js         # Real-time risk simulator
│   └── models/             # 3D .glb model files
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Main prediction page |
| `POST` | `/predict` | Predict diabetes risk (JSON body) |
| `POST` | `/whatif_predict` | What-if prediction (fills missing with dataset means) |
| `GET` | `/model/feature_importances` | Feature importance scores |
| `GET` | `/model/stats` | Dataset statistics |
| `GET` | `/model/metadata` | Model version info |
| `GET` | `/lifestyle` | Lifestyle planner page |

---

## 🛠️ Tech Stack

- **Backend:** Flask, Python
- **ML:** XGBoost, scikit-learn, pandas, NumPy
- **Frontend:** HTML5, CSS3 (Glassmorphism), JavaScript
- **Charts:** Chart.js
- **3D:** Google Model Viewer
- **Fonts:** Inter, Outfit (Google Fonts)

---

## ⚠️ Disclaimer

This tool is for **educational purposes only**. It is not a medical diagnostic tool. Always consult a healthcare professional for medical advice.

---

## 👨‍💻 Author

**Neelesh Ranjan**

---