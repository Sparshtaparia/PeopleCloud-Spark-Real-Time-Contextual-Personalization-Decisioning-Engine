import random
import json

def generate_synthetic_profiles(num_profiles=100):
    profiles = []
    channels = ["email", "mobile_app", "sms", "web"]
    
    for i in range(num_profiles):
        profiles.append({
            "customer_id": f"CP_{100000 + i}",
            "lifecycle_stage": random.choice(["new_visitor", "high_intent", "cart_abandoner", "loyal_customer", "churn_risk"]),
            "loyalty_tier": random.choice(["bronze", "silver", "gold", "platinum"]),
            "last_seen_channel": random.choice(channels),
            "category_affinities": {
                "fitness": round(random.uniform(0.1, 0.9), 2),
                "nutrition": round(random.uniform(0.1, 0.9), 2),
                "electronics": round(random.uniform(0.1, 0.9), 2)
            },
            "churn_risk": round(random.uniform(0.05, 0.8), 2),
            "predicted_ltv": round(random.uniform(100, 5000), 2),
            "confidence_score": round(random.uniform(0.5, 0.99), 2)
        })
    return profiles

if __name__ == "__main__":
    data = generate_synthetic_profiles(100)
    with open("synthetic_profiles.json", "w") as f:
        json.dump(data, f, indent=2)
    print("Generated 100 synthetic profiles to synthetic_profiles.json")
