"""
AI Service Entrypoint.
Delegates to main.py to expose all endpoints: /health, /predict, /train, /ocr
"""
from main import app
import uvicorn

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

