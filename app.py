from flask import Flask, render_template, request, jsonify
import joblib, os, json, pandas as pd, numpy as np

app = Flask(__name__)

# Load model and metadata
MODEL_DIR = os.path.join(app.root_path, 'model')
pipeline = joblib.load(os.path.join(MODEL_DIR, "diabetes_pipeline.pkl"))

with open(os.path.join(MODEL_DIR, "feature_importances.csv"), 'r') as f:
    fi = [dict(zip(['feature', 'importance'], line.strip().split(','))) for line in f.readlines()[1:]]

with open(os.path.join(MODEL_DIR, "dataset_stats.json"), 'r') as f:
    stats = json.load(f)

with open(os.path.join(MODEL_DIR, "metadata.json"), 'r') as f:
    meta = json.load(f)


# ---------- Utility function ----------
def safe_get(data, key, default=np.nan):
    """Extract and safely convert a value from dict; fallback to default."""
    v = data.get(key, "")
    if v == "" or v is None:
        return default
    try:
        return float(v)
    except:
        return default


# ---------- Routes ----------
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/predict', methods=['POST'])
def predict():
    """Main form prediction."""
    data = request.get_json(force=True)
    try:
        X = pd.DataFrame([{
            "Pregnancies": safe_get(data, "Pregnancies"),
            "Glucose": safe_get(data, "Glucose"),
            "BloodPressure": safe_get(data, "BloodPressure"),
            "SkinThickness": safe_get(data, "SkinThickness"),
            "Insulin": safe_get(data, "Insulin"),
            "BMI": safe_get(data, "BMI"),
            "DiabetesPedigreeFunction": safe_get(data, "DiabetesPedigreeFunction"),
            "Age": safe_get(data, "Age")
        }])

        proba = float(pipeline.predict_proba(X)[0][1])
        pred = int(pipeline.predict(X)[0])

        return jsonify({
            "probability": proba,
            "prediction": pred,
            "model_version": meta.get("model_version", "v1")
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/whatif_predict', methods=['POST'])
def whatif_predict():
    """What-If simulator prediction - fills missing with dataset mean."""
    data = request.get_json(force=True)
    try:
        # Fill missing with dataset mean values from stats
        mean_vals = stats.get('mean', stats.get('median', {}))

        X = pd.DataFrame([{
            "Pregnancies": safe_get(data, "Pregnancies", mean_vals.get("Pregnancies")),
            "Glucose": safe_get(data, "Glucose", mean_vals.get("Glucose")),
            "BloodPressure": safe_get(data, "BloodPressure", mean_vals.get("BloodPressure")),
            "SkinThickness": safe_get(data, "SkinThickness", mean_vals.get("SkinThickness")),
            "Insulin": safe_get(data, "Insulin", mean_vals.get("Insulin")),
            "BMI": safe_get(data, "BMI", mean_vals.get("BMI")),
            "DiabetesPedigreeFunction": safe_get(data, "DiabetesPedigreeFunction", mean_vals.get("DiabetesPedigreeFunction")),
            "Age": safe_get(data, "Age", mean_vals.get("Age"))
        }])

        proba = float(pipeline.predict_proba(X)[0][1])
        pred = int(pipeline.predict(X)[0])

        return jsonify({
            "probability": proba,
            "prediction": pred
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/model/feature_importances')
def model_fi():
    return jsonify(fi)


@app.route('/model/stats')
def model_stats():
    return jsonify(stats)


@app.route('/model/metadata')
def model_meta():
    return jsonify(meta)

@app.route('/lifestyle')
def lifestyle():
    return render_template('lifestyle.html')


if __name__ == "__main__":
    app.run(debug=True)
