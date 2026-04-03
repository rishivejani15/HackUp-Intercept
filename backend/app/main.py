from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import transactions, alerts, news, keys, simulator
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(transactions.router, prefix=f"{settings.API_V1_STR}/transactions", tags=["transactions"])
app.include_router(alerts.router, prefix=f"{settings.API_V1_STR}/alerts", tags=["alerts"])
app.include_router(news.router, prefix=f"{settings.API_V1_STR}/news", tags=["news"])
app.include_router(keys.router, prefix=f"{settings.API_V1_STR}/keys", tags=["keys"])
app.include_router(simulator.router, prefix=f"{settings.API_V1_STR}/simulator", tags=["simulator"])

@app.get("/")
async def root():
    return {
        "status": "InterceptAI Intelligence Hub Operational",
        "version": settings.VERSION,
        "firebase_connected": True # Simplified for status check
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "intercept-ai-backend"}
