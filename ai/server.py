"""
AI Service Entrypoint.
Delegates to main.py to expose all endpoints: /health, /predict, /train, /ocr
"""
import os
from main import app
import uvicorn

if __name__ == "__main__":
    host = os.getenv("AI_SERVICE_HOST", "127.0.0.1")
    port = int(os.getenv("AI_SERVICE_PORT", "8000"))
    uvicorn.run(app, host=host, port=port)
