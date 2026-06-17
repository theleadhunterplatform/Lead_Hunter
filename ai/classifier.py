import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib
import os

class LeadClassifier:
    def __init__(self):
        self.model_path = os.path.join(os.path.dirname(__file__), 'lead_model.joblib')
        self.pipeline = None

    def train(self, data):
        """
        data: List of dicts with 'content' and 'label'
        Returns dict with accuracy and sample counts.
        """
        df = pd.DataFrame(data)
        df['target'] = df['label'].apply(lambda x: 1 if x == 'relevant' else 0)

        relevant_count = int((df['target'] == 1).sum())
        irrelevant_count = int((df['target'] == 0).sum())
        sample_count = len(df)

        self.pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(stop_words='english', max_features=5000)),
            ('clf', LogisticRegression(class_weight='balanced', max_iter=1000))
        ])

        test_size = 0.2 if sample_count >= 20 else 0.0
        if test_size > 0 and len(df['target'].unique()) > 1:
            X_train, X_test, y_train, y_test = train_test_split(
                df['content'], df['target'], test_size=test_size, random_state=42, stratify=df['target']
            )
            self.pipeline.fit(X_train, y_train)
            predictions = self.pipeline.predict(X_test)
            accuracy = float(accuracy_score(y_test, predictions))
            accuracy_note = 'holdout'
        else:
            self.pipeline.fit(df['content'], df['target'])
            predictions = self.pipeline.predict(df['content'])
            accuracy = float(accuracy_score(df['target'], predictions))
            accuracy_note = 'in-sample'

        joblib.dump(self.pipeline, self.model_path)

        return {
            'accuracy': round(accuracy * 100, 1),
            'samples': sample_count,
            'relevant_count': relevant_count,
            'irrelevant_count': irrelevant_count,
            'accuracy_note': accuracy_note,
        }

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
