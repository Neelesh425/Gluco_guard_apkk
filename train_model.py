import pandas as pd
import numpy as np
import os
import json
import joblib
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report

url = "https://raw.githubusercontent.com/jbrownlee/Datasets/master/pima-indians-diabetes.data.csv"
columns = ['Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age', 'Outcome']
df = pd.read_csv(url, names=columns)

# Split features and target
X = df.drop('Outcome', axis=1)
y = df['Outcome']

# Train-test split (80/20)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Compute stats on training data BEFORE zero replacement
stats = {
    "mean": X_train.mean().to_dict(),
    "median": X_train.median().to_dict(),
    "std": X_train.std().to_dict()
}

# Replace zeros with NaN
zero_cols = ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']
X_train = X_train.copy()
X_test = X_test.copy()
X_train[zero_cols] = X_train[zero_cols].replace(0, np.nan)
X_test[zero_cols] = X_test[zero_cols].replace(0, np.nan)

# Create pipeline
pipeline = Pipeline([
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler()),
    ('classifier', XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric='logloss',

        random_state=42
    ))
])

# 5-Fold Cross Validation
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
accs, aucs = [], []

for train_idx, val_idx in skf.split(X_train, y_train):
    X_tr, X_va = X_train.iloc[train_idx], X_train.iloc[val_idx]
    y_tr, y_va = y_train.iloc[train_idx], y_train.iloc[val_idx]
    
    pipeline.fit(X_tr, y_tr)
    y_pred = pipeline.predict(X_va)
    y_proba = pipeline.predict_proba(X_va)[:, 1]
    
    accs.append(accuracy_score(y_va, y_pred))
    aucs.append(roc_auc_score(y_va, y_proba))

print(f"5-Fold CV Accuracy: {np.mean(accs):.4f}")
print(f"5-Fold CV AUC-ROC: {np.mean(aucs):.4f}")

# Train final model on 80% data
pipeline.fit(X_train, y_train)

# Evaluate on 20% test set
y_test_pred = pipeline.predict(X_test)
print("\nTest Set Classification Report:")
print(classification_report(y_test, y_test_pred))

# Ensure model directory exists
model_dir = os.path.join(os.path.dirname(__file__), 'model')
os.makedirs(model_dir, exist_ok=True)

# Save pipeline
joblib.dump(pipeline, os.path.join(model_dir, 'diabetes_pipeline.pkl'))

# Save stats
with open(os.path.join(model_dir, 'dataset_stats.json'), 'w') as f:
    json.dump(stats, f)

# Save feature importances
importances = pipeline.named_steps['classifier'].feature_importances_
fi_df = pd.DataFrame({
    'feature': X_train.columns,
    'importance': importances
})
fi_df.to_csv(os.path.join(model_dir, 'feature_importances.csv'), index=False)

# Save metadata
meta = {
    "model_version": "v2.0",
    "model": "XGBoost",
    "notes": "Trained on Pima Indians Diabetes Dataset with 5-fold CV"
}
with open(os.path.join(model_dir, 'metadata.json'), 'w') as f:
    json.dump(meta, f)

print(f"\nModel artifacts saved to {model_dir}")
