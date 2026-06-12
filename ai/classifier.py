import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
import joblib
import os

class LeadClassifier:
    def __init__(self):
        self.model_path = os.path.join(os.path.dirname(__file__), 'lead_model.joblib')
        self.pipeline = None

    def train(self, data):
        """
        data: List of dicts with 'content' and 'label'
        """
        df = pd.DataFrame(data)
        
        # Simple binary classification: relevant (1) vs irrelevant (0)
        df['target'] = df['label'].apply(lambda x: 1 if x == 'relevant' else 0)
        
        self.pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(stop_words='english', max_features=5000)),
            ('clf', LogisticRegression(class_weight='balanced'))
        ])
        
        self.pipeline.fit(df['content'], df['target'])
        joblib.dump(self.pipeline, self.model_path)
        return self.pipeline

    def load_model(self):
        if os.path.exists(self.model_path):
            self.pipeline = joblib.load(self.model_path)
            return True
        return False

    def predict(self, text):
        if not self.pipeline:
            if not self.load_model():
                return None, 0.0
        
        proba = self.pipeline.predict_proba([text])[0]
        prediction = self.pipeline.predict([text])[0]
        
        label = 'relevant' if prediction == 1 else 'irrelevant'
        confidence = float(proba[prediction])
        
        return label, confidence
