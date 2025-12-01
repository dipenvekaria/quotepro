"""
Health check and metrics endpoints
For uptime monitoring and system status
"""

from fastapi import APIRouter, Response
from datetime import datetime
import psutil
import sys

from app.logging_config import get_logger

logger = get_logger(__name__)
router = APIRouter()

# Track application start time
START_TIME = datetime.utcnow()


@router.get("/health")
async def health_check():
    """
    Simple health check endpoint
    Returns 200 OK if service is running
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "uptime_seconds": (datetime.utcnow() - START_TIME).total_seconds(),
    }


@router.get("/health/detailed")
async def detailed_health_check():
    """
    Detailed health check with system metrics
    """
    try:
        # System metrics
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "uptime_seconds": (datetime.utcnow() - START_TIME).total_seconds(),
            "system": {
                "python_version": sys.version,
                "cpu_percent": psutil.cpu_percent(interval=1),
                "memory": {
                    "total_mb": round(memory.total / 1024 / 1024, 2),
                    "available_mb": round(memory.available / 1024 / 1024, 2),
                    "percent_used": memory.percent,
                },
                "disk": {
                    "total_gb": round(disk.total / 1024 / 1024 / 1024, 2),
                    "free_gb": round(disk.free / 1024 / 1024 / 1024, 2),
                    "percent_used": disk.percent,
                }
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", exc_info=True)
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }


@router.get("/metrics")
async def metrics():
    """
    Prometheus-compatible metrics endpoint
    """
    uptime = (datetime.utcnow() - START_TIME).total_seconds()
    memory = psutil.virtual_memory()
    
    metrics_text = f"""# HELP quotepro_uptime_seconds Application uptime in seconds
# TYPE quotepro_uptime_seconds gauge
quotepro_uptime_seconds {uptime}

# HELP quotepro_memory_usage_percent Memory usage percentage
# TYPE quotepro_memory_usage_percent gauge
quotepro_memory_usage_percent {memory.percent}

# HELP quotepro_cpu_usage_percent CPU usage percentage
# TYPE quotepro_cpu_usage_percent gauge
quotepro_cpu_usage_percent {psutil.cpu_percent(interval=1)}
"""
    
    return Response(content=metrics_text, media_type="text/plain")


@router.get("/ready")
async def readiness_check():
    """
    Kubernetes-style readiness probe
    Returns 200 when service is ready to accept traffic
    """
    # Check if critical dependencies are available
    # (e.g., database connection, external services)
    
    try:
        # Add actual dependency checks here
        # For now, just return ready
        
        return {
            "status": "ready",
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}", exc_info=True)
        return Response(
            content={"status": "not ready", "error": str(e)},
            status_code=503
        )
