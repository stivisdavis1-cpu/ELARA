"""Point d'entrée du microservice IA ELARA (FastAPI).

Monte le router /ai (conseiller, fiscal, extraction) + le contrat /embeddings
attendu par api-nest, et démarre le worker RabbitMQ (document_shadow_processing)
en tâche de fond pour l'analyse d'ombre (Shadow Processing) via Ollama.
"""

import logging
import threading
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

from routers import ai_router  # noqa: E402
from routers.ai_router import EmbeddingRequest, generate_embeddings  # noqa: E402
import rabbitmq_worker  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Démarrage du worker RabbitMQ (Shadow Processing / Ollama) en tâche de fond
    worker_thread = threading.Thread(target=rabbitmq_worker.start_worker, daemon=True)
    worker_thread.start()
    yield
    rabbitmq_worker.stop_worker()


app = FastAPI(title="ELARA AI Microservice", version="2.0.0", lifespan=lifespan)

app.include_router(ai_router.router, prefix="/ai")

# Contrat attendu par api-nest (search.service / mémoire RAG)
app.post("/embeddings")(generate_embeddings)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "api-ai", "version": "2.0.0"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)