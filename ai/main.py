import asyncio
import os
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse
import numpy as np
import cv2
from PIL import Image, ImageFile
import io
import uvicorn
from pydantic import BaseModel
from classifier import LeadClassifier

# Allow Pillow to handle slightly corrupted or truncated images
ImageFile.LOAD_TRUNCATED_IMAGES = True

app = FastAPI(title="Hunter AI OCR Service")

@app.middleware("http")
async def verify_internal_secret(request: Request, call_next):
    secret = os.getenv("AI_INTERNAL_SECRET")
    # Health endpoint is left open for local container checks
    if secret and request.url.path != "/health":
        auth_header = request.headers.get("x-ai-secret") or request.headers.get("Authorization")
        if not auth_header or (auth_header != secret and auth_header != f"Bearer {secret}"):
            return JSONResponse(status_code=401, content={"error": "Unauthorized internal AI service request"})
    return await call_next(request)

# Initialize Classifier
classifier = LeadClassifier()
has_model = classifier.load_model()
if has_model:
    print("AI Relevancy Model Loaded Successfully.")
else:
    print("Warning: No AI model found. Classification will be skipped until you train.")

# EasyOCR loads only when an image is uploaded (saves RAM/CPU on startup)
reader = None


def get_reader():
    global reader
    if reader is None:
        import easyocr
        use_gpu = os.getenv("AI_USE_GPU", "false").lower() == "true"
        print(f"Initializing EasyOCR Engine (gpu={use_gpu})...")
        reader = easyocr.Reader(["en"], gpu=use_gpu)
        print("EasyOCR Engine Ready.")
    return reader


@app.post("/ocr")
async def perform_ocr(file: UploadFile = File(...)):
    print(f"[AI-OCR] Received file: {file.filename}, Type: {file.content_type}")

    if not file.content_type.startswith("image/"):
        print(f"[AI-OCR] Error: Invalid content type {file.content_type}")
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        contents = await file.read()
        print(f"[AI-OCR] Processing {len(contents)} bytes...")

        img_rgb = None

        try:
            nparr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        except Exception as cv_err:
            print(f"[AI-OCR] OpenCV Decode Failed: {str(cv_err)}")

        if img_rgb is None:
            try:
                image = Image.open(io.BytesIO(contents)).convert("RGB")
                img_rgb = np.array(image)
            except Exception as pil_err:
                print(f"[AI-OCR] CRITICAL: Both decoders failed: {str(pil_err)}")
                return {"success": False, "error": "Invalid image format", "text": ""}

        ocr_reader = get_reader()
        results = ocr_reader.readtext(img_rgb, detail=0, paragraph=True)
        full_text = " ".join(results)

        classification = None
        if has_model:
            label, confidence = classifier.predict(full_text)
            classification = {"label": label, "confidence": confidence}

        return {
            "success": True,
            "text": full_text,
            "count": len(results),
            "classification": classification,
        }
    except Exception as e:
        print(f"OCR Error: {str(e)}")
        return {"success": False, "error": str(e), "text": ""}


@app.get("/health")
async def health_check():
    return {
        "status": "online",
        "engine": "EasyOCR (lazy)",
        "classifier_loaded": has_model,
        "train_mode": "embeddings" if os.getenv("USE_EMBEDDINGS", "false").lower() in ("1", "true", "yes") else "tfidf",
    }


class TextRequest(BaseModel):
    text: str


class TrainingItem(BaseModel):
    content: str
    label: str


class TrainRequest(BaseModel):
    data: List[TrainingItem]


@app.post("/classify")
async def classify_text(request: TextRequest):
    if not has_model:
        raise HTTPException(status_code=400, detail="AI Model not trained. Label leads and click Retrain AI.")

    label, confidence = classifier.predict(request.text)
    return {"success": True, "label": label, "confidence": confidence}


@app.post("/train")
async def train_model(request: TrainRequest):
    global has_model

    samples = [
        {"content": item.content, "label": item.label}
        for item in request.data
        if item.content and item.label in ("relevant", "irrelevant")
    ]

    if len(samples) < 8:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 8 labeled leads. Received {len(samples)}.",
        )

    try:
        print(f"[AI-Train] Training on {len(samples)} labeled samples...")
        # Run CPU-heavy sklearn fit off the event loop so /health stays responsive.
        metrics = await asyncio.to_thread(classifier.train, samples)
        if metrics.get('rolled_back'):
            has_model = classifier.load_model()
            return {
                "success": True,
                "message": metrics.get("message", "Kept previous model"),
                "metrics": metrics,
            }

        has_model = True
        print(f"[AI-Train] Success! Accuracy: {metrics['accuracy']}% on {metrics['samples']} samples")

        return {
            "success": True,
            "message": "Model trained and reloaded successfully",
            "output": (
                f"Trained on {metrics['samples']} samples "
                f"({metrics['relevant_count']} relevant, {metrics['irrelevant_count']} irrelevant). "
                f"Accuracy: {metrics['accuracy']}% ({metrics['accuracy_note']})."
            ),
            "metrics": metrics,
        }
    except Exception as e:
        print(f"[AI-Train] CRITICAL Error: {str(e)}")
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
