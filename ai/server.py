from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from classifier import LeadClassifier
import uvicorn

app = FastAPI(title="Lead Gen AI Service")
classifier = LeadClassifier()
classifier.load_model()

class PostContent(BaseModel):
    content: str

@app.post("/predict")
async def predict(data: PostContent):
    label, confidence = classifier.predict(data.content)
    if label is None:
        raise HTTPException(status_code=503, detail="Model not trained yet")
    
    return {
        "label": label,
        "confidence": confidence
    }

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": classifier.pipeline is not None}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
