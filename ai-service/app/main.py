"""
Udyog Samyog — AI Service Main Application
FastAPI gateway mounting Modules A through I with security, telemetry, and health endpoints.
"""
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.modules.advisor import router as advisor_router
from app.modules.form import router as form_router
from app.modules.docintel import router as docintel_router
from app.modules.copilot import router as copilot_router
from app.modules.predict import router as predict_router
from app.modules.integrity import router as integrity_router
from app.modules.chat import router as chat_router
from app.modules.admin import router as admin_router

app = FastAPI(
    title=settings.service_name,
    version=settings.service_version,
    description="Statutory AI copilot and decision intelligence platform for Maharashtra Single-Window System",
)

# Enable CORS for communication with Node.js portal and browser frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "ok": False,
            "error": "InternalAIServiceError",
            "message": str(exc),
            "endpoint": request.url.path,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


# System Health & Version
@app.get("/ai/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.service_name,
        "version": settings.service_version,
        "rules_version": settings.rules_version,
        "kb_version": settings.kb_version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }



@app.get("/ai/version")
async def version_info():
    return {
        "service_version": settings.service_version,
        "rules_version": settings.rules_version,
        "kb_version": settings.kb_version,
        "default_lang": settings.default_lang,
    }


# Mount Module Routers
app.include_router(advisor_router)
app.include_router(form_router)
app.include_router(docintel_router)
app.include_router(copilot_router)
app.include_router(predict_router)
app.include_router(integrity_router)
app.include_router(chat_router)
app.include_router(admin_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
