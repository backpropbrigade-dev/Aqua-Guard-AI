# Plastic detection (HOG + Linear SVM)

This folder contains your **training and sliding-window inference** pipeline (Python). The AquaGuard **web app** (TypeScript) does not run this code in the browser; it uses demo scores in `src/lib/plastic-uav-algorithm.ts` until you connect a **backend** or **export** that returns severity.

## Security

If you previously committed or shared a Roboflow API key, **revoke and rotate it** in your Roboflow account. This repo uses the environment variable `ROBOFLOW_API_KEY` only — never hardcode keys.

## Setup

```bash
cd ml/plastic_hog_svm
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

## Train + run test predictions

```bash
set ROBOFLOW_API_KEY=your_key_here
python train_hog_svm.py
```

Optional: dataset already on disk (skip download):

```bash
python train_hog_svm.py --dataset "C:\path\to\Plastic-Detection-Dataset-1"
```

Artifacts:

- Trained pipeline: `models/hog_svm_plastic.joblib` (created after training)
- Visualized test outputs: `runs/detect/predict_simple/`

## Linking to AquaGuard UAV automation

1. **Policy threshold** is in TypeScript: `UAV_SEVERITY_AUTO_DISPATCH_THRESHOLD_PERCENT` in `src/lib/plastic-uav-algorithm.ts` (default **> 50**).
2. Map your model output to **0–100** in `plasticPollutionSeverityScore()` — e.g. from `decision_function`, detection count, or mean confidence over windows.
3. Production options:
   - **API**: small Python (FastAPI/Flask) service loads `hog_svm_plastic.joblib`, runs sliding window on uploaded images, returns `{ severityPercent, boxes }`; the React app calls it when submitting a report.
   - **Batch**: pre-score assets offline and store results in your database.

## Notebook vs script

The original `#%%` notebook cells map to a single `train_hog_svm.py`. For Jupyter, you can `%run train_hog_svm.py` or copy sections into cells.
