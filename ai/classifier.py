import os
import shutil
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')
MIN_ACCURACY_TO_ACCEPT = float(os.getenv('MIN_MODEL_ACCURACY', '0'))


class EmbeddingEncoder(BaseEstimator, TransformerMixin):
    """Sentence embeddings — stronger than TF-IDF for paraphrased buyer posts."""

    def __init__(self, model_name: str = EMBEDDING_MODEL):
        self.model_name = model_name
        self._model = None

    def fit(self, X, y=None):
        try:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self.model_name)
        except Exception as exc:
            raise RuntimeError(f'Embedding model unavailable: {exc}') from exc
        return self

    def transform(self, X):
        if self._model is None:
            raise RuntimeError('EmbeddingEncoder is not fitted')
        texts = [str(x) for x in X]
        vectors = self._model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
        return np.asarray(vectors)


class LeadClassifier:
    def __init__(self):
        base_dir = os.path.dirname(__file__)
        self.model_path = os.path.join(base_dir, 'lead_model.joblib')
        self.backup_path = os.path.join(base_dir, 'lead_model_backup.joblib')
        self.pipeline = None
        self.vectorizer_type = 'embeddings'

    def _build_tfidf_pipeline(self):
        return Pipeline([
            ('tfidf', TfidfVectorizer(
                stop_words='english',
                max_features=8000,
                ngram_range=(1, 2),
                sublinear_tf=True,
                min_df=1,
            )),
            ('clf', LogisticRegression(class_weight='balanced', max_iter=2000, C=0.75)),
        ])

    def _build_embedding_pipeline(self):
        return Pipeline([
            ('embed', EmbeddingEncoder()),
            ('clf', LogisticRegression(class_weight='balanced', max_iter=2000, C=0.5)),
        ])

    def _backup_current_model(self):
        if os.path.exists(self.model_path):
            shutil.copy2(self.model_path, self.backup_path)

    def _restore_backup(self):
        if os.path.exists(self.backup_path):
            shutil.copy2(self.backup_path, self.model_path)
            self.load_model()
            return True
        return False

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

        pipeline, vectorizer_type = self._build_embedding_pipeline(), 'embeddings'

        test_size = 0.2 if sample_count >= 20 else 0.0
        try:
            if test_size > 0 and len(df['target'].unique()) > 1:
                X_train, X_test, y_train, y_test = train_test_split(
                    df['content'], df['target'], test_size=test_size, random_state=42, stratify=df['target']
                )
                pipeline.fit(X_train, y_train)
                predictions = pipeline.predict(X_test)
                accuracy = float(accuracy_score(y_test, predictions))
                accuracy_note = 'holdout'
            else:
                pipeline.fit(df['content'], df['target'])
                predictions = pipeline.predict(df['content'])
                accuracy = float(accuracy_score(df['target'], predictions))
                accuracy_note = 'in-sample'
        except Exception as embed_err:
            print(f'[AI-Train] Embeddings unavailable ({embed_err}); falling back to TF-IDF.')
            pipeline, vectorizer_type = self._build_tfidf_pipeline(), 'tfidf'
            if test_size > 0 and len(df['target'].unique()) > 1:
                X_train, X_test, y_train, y_test = train_test_split(
                    df['content'], df['target'], test_size=test_size, random_state=42, stratify=df['target']
                )
                pipeline.fit(X_train, y_train)
                predictions = pipeline.predict(X_test)
                accuracy = float(accuracy_score(y_test, predictions))
                accuracy_note = 'holdout'
            else:
                pipeline.fit(df['content'], df['target'])
                predictions = pipeline.predict(df['content'])
                accuracy = float(accuracy_score(df['target'], predictions))
                accuracy_note = 'in-sample'

        previous_accuracy = None
        if os.path.exists(self.model_path):
            try:
                old = joblib.load(self.model_path)
                meta = old.get('meta', {}) if isinstance(old, dict) else {}
                previous_accuracy = meta.get('accuracy')
            except Exception:
                previous_accuracy = None

        if (
            previous_accuracy is not None
            and accuracy_note == 'holdout'
            and accuracy < previous_accuracy - 0.05
            and accuracy < MIN_ACCURACY_TO_ACCEPT + 0.55
        ):
            return {
                'accuracy': round(previous_accuracy * 100, 1),
                'samples': sample_count,
                'relevant_count': relevant_count,
                'irrelevant_count': irrelevant_count,
                'accuracy_note': 'rollback',
                'vectorizer': vectorizer_type,
                'rolled_back': True,
                'message': (
                    f'New model accuracy {round(accuracy * 100, 1)}% worse than '
                    f'{round(previous_accuracy * 100, 1)}% — kept previous model.'
                ),
            }

        self._backup_current_model()

        bundle = {
            'pipeline': pipeline,
            'meta': {
                'accuracy': accuracy,
                'samples': sample_count,
                'vectorizer': vectorizer_type,
                'trained_at': datetime.now(timezone.utc).isoformat(),
            },
        }
        joblib.dump(bundle, self.model_path)

        self.pipeline = pipeline
        self.vectorizer_type = vectorizer_type

        return {
            'accuracy': round(accuracy * 100, 1),
            'samples': sample_count,
            'relevant_count': relevant_count,
            'irrelevant_count': irrelevant_count,
            'accuracy_note': accuracy_note,
            'vectorizer': vectorizer_type,
            'rolled_back': False,
        }

    def load_model(self):
        if not os.path.exists(self.model_path):
            return False

        loaded = joblib.load(self.model_path)
        if isinstance(loaded, dict) and 'pipeline' in loaded:
            self.pipeline = loaded['pipeline']
            self.vectorizer_type = loaded.get('meta', {}).get('vectorizer', 'embeddings')
            return True

        # Legacy TF-IDF-only joblib file
        self.pipeline = loaded
        self.vectorizer_type = 'tfidf'
        return True

    def predict(self, text):
        if not self.pipeline:
            if not self.load_model():
                return None, 0.0

        proba = self.pipeline.predict_proba([text])[0]
        prediction = self.pipeline.predict([text])[0]

        label = 'relevant' if prediction == 1 else 'irrelevant'
        confidence = float(proba[prediction])

        return label, confidence
