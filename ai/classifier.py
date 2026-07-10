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
from sklearn.metrics import accuracy_score, f1_score, balanced_accuracy_score

EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')
MIN_ACCURACY_TO_ACCEPT = float(os.getenv('MIN_MODEL_ACCURACY', '0'))
# TF-IDF is default on Render free/starter — embeddings + torch often OOM or 502 on /train.
USE_EMBEDDINGS = os.getenv('USE_EMBEDDINGS', 'false').lower() in ('1', 'true', 'yes')
MAX_TRAIN_SAMPLES = int(os.getenv('MAX_TRAIN_SAMPLES', '400'))
MAX_CONTENT_CHARS = int(os.getenv('MAX_CONTENT_CHARS', '1500'))
# Cap majority class so training isn't ~100% relevant (hurts real accuracy).
MAX_CLASS_RATIO = float(os.getenv('MAX_CLASS_RATIO', '3.0'))
MIN_IRRELEVANT_FOR_QUALITY = int(os.getenv('MIN_IRRELEVANT_FOR_QUALITY', '20'))


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

    def _build_tfidf_pipeline(self, sample_count: int):
        # With more data, ignore rare one-off tokens (less overfitting).
        min_df = 2 if sample_count >= 40 else 1
        return Pipeline([
            ('tfidf', TfidfVectorizer(
                stop_words='english',
                max_features=10000,
                ngram_range=(1, 3),
                sublinear_tf=True,
                min_df=min_df,
                max_df=0.95,
            )),
            ('clf', LogisticRegression(
                class_weight='balanced',
                max_iter=3000,
                C=1.0,
                solver='liblinear',
            )),
        ])

    def _build_embedding_pipeline(self):
        return Pipeline([
            ('embed', EmbeddingEncoder()),
            ('clf', LogisticRegression(class_weight='balanced', max_iter=3000, C=0.75, solver='liblinear')),
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

    def _prepare_frame(self, data):
        rows = []
        seen = set()
        for item in data:
            content = str(item.get('content') or '').strip()
            label = item.get('label')
            if not content or label not in ('relevant', 'irrelevant'):
                continue
            if len(content) > MAX_CONTENT_CHARS:
                content = content[:MAX_CONTENT_CHARS]
            key = f'{label}:{content[:200].lower()}'
            if key in seen:
                continue
            seen.add(key)
            rows.append({'content': content, 'label': label})

        if not rows:
            raise ValueError('No valid training samples after cleanup')

        df = pd.DataFrame(rows)
        df['target'] = df['label'].apply(lambda x: 1 if x == 'relevant' else 0)
        df = self._balance_classes(df)

        if len(df) > MAX_TRAIN_SAMPLES:
            # Keep class mix while capping size.
            relevant = df[df['target'] == 1]
            irrelevant = df[df['target'] == 0]
            half = MAX_TRAIN_SAMPLES // 2
            if len(irrelevant) == 0:
                df = relevant.head(MAX_TRAIN_SAMPLES)
            elif len(relevant) == 0:
                df = irrelevant.head(MAX_TRAIN_SAMPLES)
            else:
                df = pd.concat([
                    relevant.head(half),
                    irrelevant.head(MAX_TRAIN_SAMPLES - half),
                ], ignore_index=True)

        return df.reset_index(drop=True)

    def _balance_classes(self, df: pd.DataFrame) -> pd.DataFrame:
        """Undersample majority class so one label doesn't dominate training."""
        relevant = df[df['target'] == 1]
        irrelevant = df[df['target'] == 0]
        if len(relevant) == 0 or len(irrelevant) == 0:
            return df

        maj, minority = (relevant, irrelevant) if len(relevant) >= len(irrelevant) else (irrelevant, relevant)
        max_maj = max(len(minority), int(len(minority) * MAX_CLASS_RATIO))
        if len(maj) > max_maj:
            maj = maj.sample(n=max_maj, random_state=42)
            print(
                f'[AI-Train] Balanced classes: kept {len(maj)} majority / '
                f'{len(minority)} minority (max ratio {MAX_CLASS_RATIO}:1)'
            )
        return pd.concat([maj, minority], ignore_index=True).sample(frac=1, random_state=42)

    def _fit_evaluate(self, pipeline, df, test_size):
        if test_size > 0 and len(df['target'].unique()) > 1:
            X_train, X_test, y_train, y_test = train_test_split(
                df['content'], df['target'], test_size=test_size, random_state=42, stratify=df['target']
            )
            pipeline.fit(X_train, y_train)
            predictions = pipeline.predict(X_test)
            # Prefer balanced metrics when classes are uneven.
            bal = float(balanced_accuracy_score(y_test, predictions))
            f1 = float(f1_score(y_test, predictions, average='weighted', zero_division=0))
            accuracy = (bal + f1) / 2.0
            return accuracy, 'holdout'

        pipeline.fit(df['content'], df['target'])
        predictions = pipeline.predict(df['content'])
        if len(df['target'].unique()) > 1:
            bal = float(balanced_accuracy_score(df['target'], predictions))
            f1 = float(f1_score(df['target'], predictions, average='weighted', zero_division=0))
            accuracy = (bal + f1) / 2.0
        else:
            accuracy = float(accuracy_score(df['target'], predictions))
        return accuracy, 'in-sample'

    def train(self, data):
        """
        data: List of dicts with 'content' and 'label'
        Returns dict with accuracy and sample counts.
        """
        df = self._prepare_frame(data)

        relevant_count = int((df['target'] == 1).sum())
        irrelevant_count = int((df['target'] == 0).sum())
        sample_count = len(df)
        test_size = 0.2 if sample_count >= 20 and relevant_count > 0 and irrelevant_count > 0 else 0.0

        quality_warning = None
        if irrelevant_count == 0 or relevant_count == 0:
            quality_warning = (
                'Only one class in training data — label more of the missing class '
                '(especially irrelevant) before trusting accuracy.'
            )
        elif irrelevant_count < MIN_IRRELEVANT_FOR_QUALITY:
            quality_warning = (
                f'Only {irrelevant_count} irrelevant samples. '
                f'Add at least {MIN_IRRELEVANT_FOR_QUALITY} irrelevant labels for better accuracy.'
            )

        if USE_EMBEDDINGS:
            try:
                print(f'[AI-Train] Using embeddings on {sample_count} samples...')
                pipeline, vectorizer_type = self._build_embedding_pipeline(), 'embeddings'
                accuracy, accuracy_note = self._fit_evaluate(pipeline, df, test_size)
            except Exception as embed_err:
                print(f'[AI-Train] Embeddings unavailable ({embed_err}); falling back to TF-IDF.')
                pipeline, vectorizer_type = self._build_tfidf_pipeline(sample_count), 'tfidf'
                accuracy, accuracy_note = self._fit_evaluate(pipeline, df, test_size)
        else:
            print(f'[AI-Train] Using TF-IDF on {sample_count} samples (set USE_EMBEDDINGS=true for embeddings)...')
            pipeline, vectorizer_type = self._build_tfidf_pipeline(sample_count), 'tfidf'
            accuracy, accuracy_note = self._fit_evaluate(pipeline, df, test_size)

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
            'quality_warning': quality_warning,
            'message': quality_warning,
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
