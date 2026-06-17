import faiss
import numpy as np

# Dummy Product Catalog (Offers)
CATALOG = [
    {"id": "OFF_FITNESS_10", "name": "10% off fitness bundle", "category": "fitness", "expected_margin": 15.0},
    {"id": "OFF_PROTEIN_SUB", "name": "Protein subscription 1st month free", "category": "nutrition", "expected_margin": 25.0},
    {"id": "OFF_WATCH_ACC", "name": "Smartwatch accessory 20% off", "category": "electronics", "expected_margin": 10.0},
    {"id": "OFF_STORE_COUPON", "name": "$5 Store coupon", "category": "general", "expected_margin": -5.0},
    {"id": "OFF_LOYALTY_UPG", "name": "Gold loyalty upgrade", "category": "loyalty", "expected_margin": 50.0},
]

class RecommendationService:
    def __init__(self):
        # Initialize a basic FAISS index for candidate retrieval (Stage 1)
        # In a real system, these would be user/product embeddings from a two-tower model
        self.dimension = 4  # e.g., fitness, nutrition, electronics, loyalty affinities
        self.index = faiss.IndexFlatL2(self.dimension)
        
        # Add catalog vectors
        # fitness, nutrition, electronics, loyalty
        catalog_vectors = np.array([
            [1.0, 0.0, 0.0, 0.0], # OFF_FITNESS_10
            [0.0, 1.0, 0.0, 0.0], # OFF_PROTEIN_SUB
            [0.0, 0.0, 1.0, 0.0], # OFF_WATCH_ACC
            [0.2, 0.2, 0.2, 0.4], # OFF_STORE_COUPON
            [0.0, 0.0, 0.0, 1.0], # OFF_LOYALTY_UPG
        ], dtype=np.float32)
        self.index.add(catalog_vectors)

    def get_recommendations(self, customer_profile: dict) -> list:
        """
        Stage 1: Candidate retrieval
        Stage 2: Re-ranking
        """
        # 1. Candidate Retrieval
        # Extract affinities from profile or default to 0
        affinities = customer_profile.get("category_affinities", {})
        user_vector = np.array([[
            affinities.get("fitness", 0.0),
            affinities.get("nutrition", 0.0),
            affinities.get("electronics", 0.0),
            0.5 # Default loyalty affinity
        ]], dtype=np.float32)

        # Retrieve top 3 candidates
        distances, indices = self.index.search(user_vector, 3)
        
        candidates = [CATALOG[idx] for idx in indices[0]]

        # 2. Re-ranking
        # score = conversion_prob * margin * confidence * preference * fatigue
        confidence = customer_profile.get("confidence_score", 0.8)
        
        ranked_candidates = []
        for candidate in candidates:
            # Mock conversion probability based on affinity distance (closer = higher)
            conversion_prob = np.random.uniform(0.1, 0.5) 
            margin = candidate["expected_margin"]
            fatigue_penalty = 1.0 # 1.0 means no penalty
            
            score = conversion_prob * margin * confidence * fatigue_penalty
            ranked_candidates.append({
                "offer": candidate,
                "score": score
            })

        # Sort by score descending
        ranked_candidates.sort(key=lambda x: x["score"], reverse=True)
        return [c["offer"] for c in ranked_candidates]
