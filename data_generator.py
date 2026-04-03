import json
import random
import uuid
from datetime import datetime, timedelta

def generate_transactions(num=50):
    base_timestamp = datetime(2026, 4, 3, 21, 45, 0)
    payment_methods = ["credit_card", "debit_card", "mobile_wallet", "bank_transfer"]
    merchants = ["City MiniMart", "Tech Store", "Grocery Plus", "Gas Station", "Online Retailer", "Coffee Shop"]
    
    transactions = []
    
    for i in range(num):
        tx = {
            "transaction_id": f"TXN-{uuid.uuid4().hex[:12].upper()}",
            "features": {
                "amount": round(random.uniform(10.0, 5000.0), 2),
                "use_chip": random.choice([0, 1]),
                "merchant_city": random.randint(1, 100),
                "merchant_state": random.randint(1, 50),
                "zip": random.randint(10000, 99999),
                "mcc": random.randint(1000, 9999),
                "errors": random.choice([0, 0, 0, 1, 2]),
                "current_age": random.randint(18, 80),
                "retirement_age": random.choice([60, 65, 67, 70]),
                "birth_year": random.randint(1940, 2005),
                "birth_month": random.randint(1, 12),
                "gender": random.choice([0, 1]),
                "address": random.randint(10000, 99999),
                "latitude": round(random.uniform(25.0, 48.0), 4),
                "longitude": round(random.uniform(-124.0, -66.0), 4),
                "per_capita_income": random.randint(20000, 150000),
                "yearly_income": random.randint(30000, 300000),
                "total_debt": random.randint(0, 100000),
                "credit_score": random.randint(300, 850),
                "num_credit_cards": random.randint(1, 10),
                "client_id_card": random.randint(100000, 999999),
                "card_brand": random.randint(1, 4),
                "card_type": random.randint(1, 3),
                "card_number": random.randint(100000, 999999),
                "expires": random.randint(202501, 203512),
                "cvv": random.randint(100, 999),
                "has_chip": random.choice([0, 1]),
                "num_cards_issued": random.randint(1, 5),
                "credit_limit": random.choice([1000, 5000, 10000, 20000, 50000]),
                "acct_open_date": random.randint(201001, 202412),
                "year_pin_last_changed": random.randint(2015, 2026),
                "card_on_dark_web": random.choice([0, 1]),
                "mcc_description": random.randint(1, 50),
                "transaction_day_index": random.randint(1, 3000),
                "user_avg_amount": round(random.uniform(50.0, 1000.0), 2),
                "user_std_amount": round(random.uniform(10.0, 500.0), 2),
                "user_tx_frequency": round(random.uniform(0.1, 5.0), 2),
                "user_active_day_index": random.randint(1, 3000),
                "amount_deviation": round(random.uniform(0.0, 2000.0), 2),
                "transaction_velocity": random.randint(1, 100),
                "rolling_mean_amount": round(random.uniform(50.0, 1000.0), 2),
                "rolling_std_amount": round(random.uniform(10.0, 2000.0), 2),
                "transaction_gap_from_first_day": random.randint(100, 4000),
                "transaction_history_length": random.randint(10, 2000),
                "is_new_user": random.choice([0, 1]),
                "card_to_history_ratio": round(random.uniform(0.001, 0.05), 4),
                "high_card_velocity_flag": random.choice([0, 1]),
                "merchant_fraud_rate": round(random.uniform(0.0, 1.0), 2),
                "merchant_tx_count": random.randint(1, 1000),
                "merchant_avg_amount": round(random.uniform(50.0, 500.0), 2),
                "merchant_std_amount": round(random.uniform(10.0, 300.0), 2),
                "merchant_risk_score": round(random.uniform(0.0, 1.0), 2),
                "geo_cluster_fraud_rate": round(random.uniform(0.0, 1.0), 2),
                "geo_cluster_size": random.randint(100, 5000),
                "peer_cluster_fraud_rate": round(random.uniform(0.0, 1.0), 2),
                "peer_cluster_size": random.randint(100, 5000),
                "merchant_outlier_score": round(random.uniform(0.0, 10.0), 2),
                "cluster_avg_amount": round(random.uniform(50.0, 1000.0), 2),
                "cluster_std_amount": round(random.uniform(10.0, 500.0), 2),
                "cluster_outlier_score": round(random.uniform(0.0, 10.0), 2),
                "anomaly_score": round(random.uniform(0.0, 1.0), 2)
            },
            "meta": {
                "payment_method": random.choice(payment_methods),
                "merchant_name": random.choice(merchants),
                "timestamp": (base_timestamp + timedelta(minutes=random.randint(1, 100000))).strftime("%Y-%m-%dT%H:%M:%SZ")
            }
        }
        transactions.append(tx)
        
    return transactions

if __name__ == "__main__":
    txs = generate_transactions(50)
    with open("generated_transactions.json", "w") as f:
        json.dump(txs, f, indent=2)
    print("Generated 50 transactions and saved to generated_transactions.json")
