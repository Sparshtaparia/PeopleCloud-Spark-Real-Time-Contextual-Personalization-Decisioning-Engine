import os
import json
import psycopg2
from dotenv import load_dotenv
import synthetic_data

load_dotenv()
DATABASE_URL = os.environ.get("DATABASE_URL")

def create_and_feed_db():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found in .env")
        return

    print("Connecting to PostgreSQL...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    print("Creating customers table...")
    cur.execute("""
        DROP TABLE IF EXISTS customers;
        CREATE TABLE customers (
            customer_id VARCHAR(50) PRIMARY KEY,
            lifecycle_stage VARCHAR(50),
            loyalty_tier VARCHAR(50),
            last_seen_channel VARCHAR(50),
            category_affinities JSONB,
            churn_risk FLOAT,
            predicted_ltv FLOAT,
            confidence_score FLOAT
        );
    """)
    conn.commit()

    print("Generating synthetic data...")
    profiles = synthetic_data.generate_synthetic_profiles(100)

    print("Inserting data into Supabase...")
    insert_query = """
        INSERT INTO customers (
            customer_id, lifecycle_stage, loyalty_tier, last_seen_channel, 
            category_affinities, churn_risk, predicted_ltv, confidence_score
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """

    for p in profiles:
        cur.execute(insert_query, (
            p["customer_id"],
            p["lifecycle_stage"],
            p["loyalty_tier"],
            p["last_seen_channel"],
            json.dumps(p["category_affinities"]),
            p["churn_risk"],
            p["predicted_ltv"],
            p["confidence_score"]
        ))
    
    conn.commit()
    cur.close()
    conn.close()
    print("Successfully inserted 100 profiles into Supabase!")

if __name__ == "__main__":
    create_and_feed_db()
