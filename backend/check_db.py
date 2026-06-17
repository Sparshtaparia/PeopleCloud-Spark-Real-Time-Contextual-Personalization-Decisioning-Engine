import os
import psycopg2
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
DATABASE_URL = os.environ.get("DATABASE_URL")

def check_connections():
    print("Checking Supabase REST API connection...")
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("[SUCCESS] Supabase REST Client initialized successfully.")
    except Exception as e:
        print(f"[FAIL] Supabase REST Client failed: {e}")

    print("\nChecking PostgreSQL Direct connection via DATABASE_URL...")
    if not DATABASE_URL:
        print("[FAIL] DATABASE_URL is missing from .env")
        return
        
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("SELECT version();")
        db_version = cur.fetchone()
        print(f"[SUCCESS] PostgreSQL connection successful! DB Version: {db_version[0]}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[FAIL] PostgreSQL connection failed: {e}")

if __name__ == "__main__":
    check_connections()
