from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client[os.getenv("DB_NAME", "careerpath_sa")]

# Collections
users_col      = db["users"]
courses_col    = db["courses"]
uploads_col    = db["uploads"]
results_col    = db["results"]
chat_col       = db["chat_history"]
tracking_col   = db["grade11_tracking"]

# Indexes — run once on startup
def create_indexes():
    users_col.create_index("email", unique=True)
    courses_col.create_index("institution")
    courses_col.create_index("faculty")
    results_col.create_index("user_id")
    tracking_col.create_index("user_id")
