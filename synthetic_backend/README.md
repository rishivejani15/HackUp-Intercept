# Synthetic Identity Detection Backend

This is the standalone **Synthetic Identity Detection module** built as part of the Financial Fraud Detection pipeline. It runs alongside the XGBoost / ML scoring mechanism, analyzes rule-based heuristics tied to account takeover (ATO), pure drain patterns, and creates rich feature logic directly from raw transactional context.

The system is fully in-memory and executes evaluations in `< 100ms`, meeting real-time processing goals for the 24-hour hackathon.

## Features Added 🚀
- **In-Memory Cache**: Full dataset loaded at startup. Sub-10ms response for querying.
- **Smart Dummy Risk**: Mimics expected ML behaviors (scores ATOs and drains high) to enable realistic frontend demos immediately.
- **NetworkX Fraud Rings**: High-performance graph traversal for grouping connected attributes (branch/amount tolerances, money mule destinations).
- **LifeCycle / Timelines**: Track the historical step-by-step lifecycle of malicious origin accounts leading up to a "Bust-Out".
- **Real-Time SOC Alerts**: Live threat feed capability querying instantly flagged synthetic blocks.

---

## 🏃 Running the Service

### Prerequisites
- Python 3.10+
- Virtual environment (recommended)

### Installation
1. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```
2. Make sure the `Datasets.csv` file is available inside the project root folder. (The backend will look for `../Datasets.csv`).

### Execution
Start the API locally using Uvicorn:
```bash
uvicorn main:app --reload
```
The API will be available at: http://localhost:8000

---

## 🤝 TEAMMATE INTEGRATION (XGBoost ML)

When the XGBoost component is ready, you need to swap the `dummy_txn_risk` function with your model predictions. 

I've explicitly marked every location with: 
`# REPLACE_WITH_XGBOOST`

To integrate:
1. Open `scorer.py` and write your inference code in `dummy_txn_risk(features)` or replace the function entirely.
2. Open `main.py` and look for the `# TEAMMATE INTEGRATION POINT` block.
3. Pass your XGBoost float to the `risk` variable. The system will handle standardizing, weighting (0.7 ML / 0.3 Synthetic), and creating threshold decisions.

---

## 🔌 Core Endpoints

* **`POST /transaction/evaluate`** -> Real-time live inference on a brand new transaction. This automatically appends to the live cache for alert rendering.
* **`GET /transactions`** -> Pre-scored list from the startup. Fast paginated loading. Filterable by limit, sorting (risk), and decisions.
* **`GET /model-stats`** -> Direct comparison stats against the failing prior ruleset (e.g. `isFlaggedFraud`). Confirms our coverage versus baseline.
* **`GET /fraud-rings`** -> Displays graph connections identified between node accounts using NetworkX.
* **`GET /alerts`** -> Streams heavily blocked SOC-style alerts.
* **`GET /accounts/{name}/timeline`** -> Traces an account's trajectory to visually tell the story to judges!
