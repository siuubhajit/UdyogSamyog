r"""
Udyog Samyog AI Service Entrypoint
Run from anywhere: .\ai-service\.venv\Scripts\python.exe ai-service\run.py
Or simply: npm run ai
"""
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Switch working directory to ai-service to support Windows multiprocessing reload
os.chdir(BASE_DIR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        app_dir=BASE_DIR,
    )

