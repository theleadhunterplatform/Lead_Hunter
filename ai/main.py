import os
from fastapi import FastAPI, UploadFile, File, HTTPException
import easyocr
import numpy as np
import cv2
from PIL import Image, ImageFile
import io
import uvicorn
import subprocess
from pydantic import BaseModel
from classifier import LeadClassifier

# Allow Pillow to handle slightly corrupted or truncated images
ImageFile.LOAD_TRUNCATED_IMAGES = True

app = FastAPI(title="Hunter AI OCR Service")

# Initialize Classifier
classifier = LeadClassifier()
has_model = classifier.load_model()
if has_model:
    print("AI Relevancy Model Loaded Successfully.")
else:
    print("Warning: No AI model found. Classification will be skipped.")

# Initialize EasyOCR Reader (English)
# This will download the model on the first run
print("Initializing EasyOCR Engine...")
reader = easyocr.Reader(['en'], gpu=True) # Set gpu=True if you have CUDA
print("EasyOCR Engine Ready.")

@app.post("/ocr")
async def perform_ocr(file: UploadFile = File(...)):
    # Validate file type
    print(f"[AI-OCR] Received file: {file.filename}, Type: {file.content_type}")
    
    if not file.content_type.startswith("image/"):
        print(f"[AI-OCR] Error: Invalid content type {file.content_type}")
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        # Read image bytes
        contents = await file.read()
        print(f"[AI-OCR] Processing {len(contents)} bytes...")
        
        img_rgb = None
        
        # Strategy 1: OpenCV (Fast)
        try:
            nparr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is not None:
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                print(f"[AI-OCR] OpenCV Success: {img.shape[1]}x{img.shape[0]}")
        except Exception as cv_err:
            print(f"[AI-OCR] OpenCV Decode Failed (Expected for some PNGs): {str(cv_err)}")

        # Strategy 2: Pillow (Robust Fallback for corrupted/malformed images)
        if img_rgb is None:
            try:
                print("[AI-OCR] Attempting Robust Fallback (Pillow)...")
                image = Image.open(io.BytesIO(contents)).convert("RGB")
                img_rgb = np.array(image)
                print(f"[AI-OCR] Pillow Success: {image.width}x{image.height}")
            except Exception as pil_err:
                print(f"[AI-OCR] CRITICAL: Both decoders failed: {str(pil_err)}")
                return {"success": False, "error": "Invalid image format", "text": ""}
        
        # Perform OCR on the numpy array
        results = reader.readtext(img_rgb, detail=0, paragraph=True)
        
        # Join text blocks
        full_text = " ".join(results)
        
        # Auto-classify if model is available
        classification = None
        if has_model:
            label, confidence = classifier.predict(full_text)
            classification = {
                "label": label,
                "confidence": confidence
            }
        
        return {
            "success": True,
            "text": full_text,
            "count": len(results),
            "classification": classification
        }
    except Exception as e:
        print(f"OCR Error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "text": ""
        }

@app.get("/health")
async def health_check():
    return {
        "status": "online", 
        "engine": "EasyOCR",
        "classifier_loaded": has_model
    }

class TextRequest(BaseModel):
    text: str

@app.post("/classify")
async def classify_text(request: TextRequest):
    if not has_model:
        raise HTTPException(status_code=400, detail="AI Model not trained. Run train.py first.")
    
    label, confidence = classifier.predict(request.text)
    return {
        "success": True,
        "label": label,
        "confidence": confidence
    }

@app.post("/train")
async def train_model():
    try:
        # Run the training script
        print("[AI-Train] Starting model retraining...")
        result = subprocess.run(["python", "train.py"], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"[AI-Train] Error: {result.stderr}")
            return {
                "success": False, 
                "error": "Training script failed",
                "details": result.stderr
            }
        
        # Reload the model
        global has_model
        has_model = classifier.load_model()
        print(f"[AI-Train] Success! Model reloaded. Status: {has_model}")
        
        return {
            "success": True,
            "message": "Model trained and reloaded successfully",
            "output": result.stdout
        }
    except Exception as e:
        print(f"[AI-Train] CRITICAL Error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
