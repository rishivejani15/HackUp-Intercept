import os
import time
import uuid
import uuid
import pandas as pd
import networkx as nx
import numpy as np
import uvicorn

from fastapi import FastAPI, Depends, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List, Optional

from features import FeatureEngineer
from detector import SyntheticIdentityDetector
from scorer import dummy_txn_risk, combine_scores, get_confidence, make_decision
from models import (
    TransactionInput, EvaluationResult, TransactionDetail, ModelStats, 
    FraudRing, UserTimelineEvent, Alert, PaginatedTransactions
)

# Global memory cache
CACHE = []
STATS = None
RINGS = []

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading data and pre-scoring transactions...")
    dataset_path = os.path.join(os.path.dirname(__file__), "Datasets.csv")
    
    detector = SyntheticIdentityDetector()
    try:
        df = pd.read_csv(dataset_path)
    except FileNotFoundError:
        print(f"Warning: {dataset_path} not found. Starting with empty cache.")
        df = pd.DataFrame()
        
    if not df.empty:
        # Data cleaning
        if "isFraud" in df.columns:
            df = df.dropna(subset=["isFraud"])
        df = df.fillna(0)
        
        # We'll calculate some stats manually
        act_fraud = 0
        caught_exist = 0
        caught_us = 0
        synth_conf = 0
        synth_susp = 0
        decisions_bk = {"APPROVE": 0, "MFA_REQUIRED": 0, "BLOCK": 0}
        fraud_type = {}
        risk_sum = 0
        synth_sum = 0
        
        # To avoid DataFrame iteration overhead, convert to dict records
        records = df.to_dict(orient="records")
        for i, row in enumerate(records):
            
            # 1. Engineer Features
            feats = FeatureEngineer.transform_dict(row)
            
            # 2. Synthetic Identity Detector
            synth_score, verdict, signals, explanations = detector.evaluate(feats)
            
            # 3. XGBoost placeholder risk
            # ============================================================
            # TEAMMATE INTEGRATION POINT
            # When XGBoost model is ready, replace the dummy_txn_risk()
            # function with real model inference.
            # ============================================================
            risk = dummy_txn_risk(feats)
            
            # 4. Combine and Decision
            final_score = combine_scores(risk, synth_score, signals)
            decision = make_decision(final_score)
            conf = get_confidence(final_score)
            
            txn_id = f"txn_{i}"
            
            # Mappings for Pydantic
            inp = TransactionInput(
                step=int(row.get("step", 0)),
                type=str(row.get("type", "")),
                branch=str(row.get("branch", "")),
                amount=float(row.get("amount", 0)),
                nameOrig=str(row.get("nameOrig", "")),
                oldbalanceOrg=float(row.get("oldbalanceOrg", 0)),
                newbalanceOrig=float(row.get("newbalanceOrig", 0)),
                nameDest=str(row.get("nameDest", "")),
                oldbalanceDest=float(row.get("oldbalanceDest", 0)),
                newbalanceDest=float(row.get("newbalanceDest", 0)),
                unusuallogin=int(row.get("unusuallogin", 0)),
                **{"Acct type": str(row.get("Acct type", "")), 
                   "Time of day": str(row.get("Time of day", "")),
                   "Date of transaction": str(row.get("Date of transaction", "")),
                   "isFlaggedFraud": int(row.get("isFlaggedFraud", 0)),
                   "isFraud": int(row.get("isFraud", 0))}
            )
            
            eval_res = EvaluationResult(
                txn_risk=risk,
                synthetic_score=synth_score,
                confidence=conf,
                final_score=final_score,
                decision=decision,
                signals=signals,
                human_explanation=explanations,
                latency_ms=0.0
            )
            
            detail = TransactionDetail(id=txn_id, input_data=inp, evaluation=eval_res)
            CACHE.append(detail)
            
            # Stats collecting
            if inp.isFraud == 1:
                act_fraud += 1
                fraud_type[inp.type] = fraud_type.get(inp.type, 0) + 1
            if inp.isFlaggedFraud == 1 and inp.isFraud == 1:
                caught_exist += 1
            if inp.isFraud == 1 and decision in ["BLOCK", "MFA_REQUIRED"]:
                caught_us += 1
                
            if verdict == "SYNTHETIC_CONFIRMED": synth_conf += 1
            elif verdict == "SYNTHETIC_SUSPECTED": synth_susp += 1
                
            decisions_bk[decision] += 1
            risk_sum += risk
            synth_sum += synth_score
            
        # Top fraud branches
        branch_counts = df[df["isFraud"] == 1]["branch"].value_counts().head(5)
        
        global STATS
        STATS = ModelStats(
            total_transactions=len(CACHE),
            actual_frauds=act_fraud,
            fraud_rate=round(act_fraud/len(CACHE), 4) if len(CACHE) else 0,
            caught_by_existing=caught_exist,
            caught_by_us=caught_us,
            synthetic_confirmed_count=synth_conf,
            synthetic_suspected_count=synth_susp,
            decisions_breakdown=decisions_bk,
            top_fraud_branches=branch_counts.index.tolist(),
            fraud_by_type=fraud_type,
            avg_risk_score=round(risk_sum/len(CACHE), 2) if len(CACHE) else 0,
            avg_synthetic_score=round(synth_sum/len(CACHE), 2) if len(CACHE) else 0
        )
        
        # Fraud Rings calculation using NetworkX
        global RINGS
        RINGS = _build_fraud_rings(CACHE)
        
        print(f"Startup complete: Loaded and pre-scored {len(CACHE)} items.")
        print(f"Existing sys caught: {caught_exist} / {act_fraud}")
        print(f"Our sys caught: {caught_us} / {act_fraud}")
            
    yield
    print("Shutting down model server...")

app = FastAPI(title="Synthetic Identity Backend Mode", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def _build_fraud_rings(cache: List[TransactionDetail]) -> List[FraudRing]:
    G = nx.Graph()
    for item in cache:
        G.add_node(item.id)
    
    # 1. same nameDest
    by_dest = {}
    for i in cache:
        if i.input_data.nameDest:
            by_dest.setdefault(i.input_data.nameDest, []).append(i.id)
    for ids in by_dest.values():
        for idx in range(len(ids)-1):
            G.add_edge(ids[idx], ids[idx+1], shared="nameDest")

    # 2. same oldbalanceDest (mules often have exactly 0.0 or a specific small amount)
    by_oldbal = {}
    for i in cache:
        # Ignore empty balances here to reduce over-linking legits
        if i.input_data.oldbalanceDest > 0:
            by_oldbal.setdefault(i.input_data.oldbalanceDest, []).append(i.id)
    for ids in by_oldbal.values():
        for idx in range(len(ids)-1):
            G.add_edge(ids[idx], ids[idx+1], shared="oldbalanceDest")

    # 3. branch + amount pattern (10% tolerance)
    by_branch = {}
    for i in cache:
        by_branch.setdefault(i.input_data.branch, []).append(i)
    
    for branch, items in by_branch.items():
        items = sorted(items, key=lambda x: x.input_data.amount)
        for idx in range(len(items)):
            for jdx in range(idx+1, len(items)):
                max_amt = max(items[idx].input_data.amount, items[jdx].input_data.amount)
                if max_amt == 0: continue
                if abs(items[idx].input_data.amount - items[jdx].input_data.amount) / max_amt <= 0.10:
                    G.add_edge(items[idx].id, items[jdx].id, shared="branch_amount_pattern")
                else: 
                    break # since it's sorted, amount differences will only grow
                    
    rings = []
    for comp in nx.connected_components(G):
        if len(comp) >= 2:
            edges = G.subgraph(comp).edges(data=True)
            shared_attr = {}
            for u, v, d in edges:
                shared_attr[d.get("shared", "unknown")] = "link match"
            
            rings.append(FraudRing(
                ring_id=str(uuid.uuid4())[:8],
                size=len(comp),
                member_transactions=list(comp),
                shared_attributes=shared_attr
            ))
            
    return sorted(rings, key=lambda x: x.size, reverse=True)


@app.post("/transaction/evaluate", response_model=EvaluationResult)
async def evaluate_transaction(txn: TransactionInput):
    t0 = time.perf_counter()
    raw = txn.model_dump(by_alias=True)
    
    feats = FeatureEngineer.transform_dict(raw)
    score, verdict, signals, explanations = SyntheticIdentityDetector().evaluate(feats)
    
    # ============================================================
    # TEAMMATE INTEGRATION POINT
    # REPLACE_WITH_XGBOOST
    # ============================================================
    risk = dummy_txn_risk(feats)
    final_score = combine_scores(risk, score, signals)
    decision = make_decision(final_score)
    conf = get_confidence(final_score)
    
    elapsed = (time.perf_counter() - t0) * 1000
    res = EvaluationResult(
        txn_risk=risk,
        synthetic_score=score,
        confidence=conf,
        final_score=final_score,
        decision=decision,
        signals=signals,
        human_explanation=explanations,
        latency_ms=round(elapsed, 2)
    )
    
    # Optionally, we append live evals to cache
    new_id = f"live_{uuid.uuid4().hex[:6]}"
    CACHE.append(TransactionDetail(id=new_id, input_data=txn, evaluation=res))
    return res

@app.get("/transactions", response_model=PaginatedTransactions)
async def get_transactions(
    limit: int = 100, 
    sort: str = "risk_desc", 
    filter_decision: Optional[str] = None
):
    results = CACHE
    
    if filter_decision:
        results = [r for r in results if r.evaluation.decision == filter_decision]
        
    if sort == "risk_desc":
        results.sort(key=lambda x: x.evaluation.final_score, reverse=True)
    elif sort == "risk_asc":
        results.sort(key=lambda x: x.evaluation.final_score, reverse=False)
    elif sort == "amount_desc":
        results.sort(key=lambda x: x.input_data.amount, reverse=True)
        
    return PaginatedTransactions(
        total=len(results),
        limit=limit,
        transactions=results[:limit]
    )


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

@app.get("/transactions/{id}/detail", response_model=TransactionDetail)
async def get_transaction_detail(id: str):
    for r in CACHE:
        if r.id == id:
            return r
    raise HTTPException(status_code=404, detail="Transaction not found")

@app.get("/model-stats", response_model=Optional[ModelStats])
async def get_model_stats():
    return STATS

@app.get("/fraud-rings", response_model=List[FraudRing])
async def get_fraud_rings():
    return RINGS

@app.get("/accounts/{nameOrig}/timeline", response_model=List[UserTimelineEvent])
async def get_account_timeline(nameOrig: str):
    user_txns = [r for r in CACHE if r.input_data.nameOrig == nameOrig]
    user_txns.sort(key=lambda x: x.input_data.step)
    
    events = []
    for t in user_txns:
        anomaly = t.evaluation.decision in ["BLOCK", "MFA_REQUIRED"]
        events.append(UserTimelineEvent(
            transaction_id=t.id,
            step=t.input_data.step,
            date=t.input_data.date_of_transaction,
            type=t.input_data.type,
            amount=t.input_data.amount,
            balance_before=t.input_data.oldbalanceOrg,
            balance_after=t.input_data.newbalanceOrig,
            dest_account=t.input_data.nameDest,
            is_anomaly=anomaly,
            decision=t.evaluation.decision
        ))
    return events

@app.get("/alerts", response_model=List[Alert])
async def get_alerts():
    blocks = [r for r in CACHE if r.evaluation.decision == "BLOCK"]
    blocks.sort(key=lambda x: x.evaluation.synthetic_score, reverse=True)
    
    alerts = []
    for b in blocks:
        alerts.append(Alert(
            transaction_id=b.id,
            account_id=b.input_data.nameOrig,
            amount=b.input_data.amount,
            synthetic_score=b.evaluation.synthetic_score,
            signals_fired=list(b.evaluation.signals.keys()),
            human_explanation=b.evaluation.human_explanation,
            decision=b.evaluation.decision
        ))
    return alerts

@app.get("/health")
async def health():
    return {"status": "ok", "dataset_loaded": len(CACHE) > 0, "transaction_count": len(CACHE)}
