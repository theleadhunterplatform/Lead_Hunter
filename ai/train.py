import os
from pymongo import MongoClient
from dotenv import load_dotenv
from classifier import LeadClassifier

# Load environment variables from backend's .env if needed, 
# or assume they are set in the environment
load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

MONGO_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/lead-gen')

def fetch_training_data():
    client = MongoClient(MONGO_URI)
    db = client.get_database()
    # Fetch posts that have been manually labeled as training data
    # Fetch posts that have been manually labeled as training data
    posts = db.leadposts.find({
        # "is_training_data": True,
        "status": {"$in": ["relevant", "irrelevant"]}
    })
    
    data = []
    for post in posts:
        if post.get('content'):
            data.append({
                'content': post['content'],
                'label': post['status']
            })
    
    client.close()
    return data

def main():
    print("Fetching labeled data from MongoDB...")
    data = fetch_training_data()
    
    if len(data) < 10:
        print(f"Warning: Only {len(data)} labeled items found. AI might not be very accurate.")
        if len(data) == 0:
            print("Aborting training: No data.")
            return

    print(f"Training on {len(data)} items...")
    classifier = LeadClassifier()
    classifier.train(data)
    print("Model trained and saved successfully!")

if __name__ == "__main__":
    main()
