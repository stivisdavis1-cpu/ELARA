"""Compilateur de complétions LLM hybrides (routage Cloud + repli local).

Chaîne de bascule automatique (failover) pour les appels en temps réel :
1. Fournisseur Cloud principal : Groq (Llama-3.3-70b-specdec) — latence < 500 ms.
2. Fournisseur Cloud secondaire : Together AI (DeepSeek-R1 / Llama-3.3-70b-*).
3. Repli local (On-Premise / hors-ligne) : Ollama.

La configuration est 100 % pilotée par variables d'environnement afin de garantir
l'exportabilité SaaS multi-tenant ↔ On-Premise sans aucune modification du code.
Chaque étape est journalisée et toute erreur de timeout / rate-limit déclenche
la bascule immédiate vers le fournisseur suivant.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from typing import Any, Optional

import requests

logger = logging.getLogger("elara.completion")

# ---------------------------------------------------------------------------
# Configuration environnement (exportable)
# ---------------------------------------------------------------------------
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
GROQ_BASE_URL = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-specdec")

TOGETHER_API_KEY = os.environ.get("TOGETHER_API_KEY", "").strip()
TOGETHER_BASE_URL = os.environ.get("TOGETHER_BASE_URL", "https://api.together.xyz/v1")
TOGETHER_MODEL = os.environ.get("TOGETHER_MODEL", "meta-llama/Llama-3.3-70B-Instruct-Turbo")

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "mistral:latest")

EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "nomic-embed-text")
EMBEDDING_DIM = int(os.environ.get("EMBEDDING_DIM", "768"))

CLOUD_TIMEOUT_PRIMARY = float(os.environ.get("CLOUD_TIMEOUT_PRIMARY", "5"))
CLOUD_TIMEOUT_SECONDARY = float(os.environ.get("CLOUD_TIMEOUT_SECONDARY", "10"))
OLLAMA_TIMEOUT = float(os.environ.get("OLLAMA_TIMEOUT", "60"))

# Codes HTTP qui déclenchent la bascule (Rate Limit / indisponibilité serveur)
FAILOVER_HTTP_CODES = {429, 500, 502, 503, 504}


def _should_failover(exc: Exception) -> bool:
    """Détermine si une erreur doit provoquer la bascule vers le fournisseur suivant."""
    try:
        import openai
    except ImportError:
        return True

    if isinstance(exc, (openai.APITimeoutError, openai.APIConnectionError)):
        return True
    if isinstance(exc, openai.RateLimitError):
        return True
    if isinstance(exc, openai.APIStatusError):
        return exc.status_code in FAILOVER_HTTP_CODES
    return True


def _build_prompts(
    system_prompt: Optional[str],
    user_prompt: Optional[str],
    messages: Optional[list[dict[str, str]]],
) -> list[dict[str, str]]:
    """Construit la liste de messages à envoyer au modèle."""
    if messages is not None:
        return messages
    built: list[dict[str, str]] = []
    if system_prompt:
        built.append({"role": "system", "content": system_prompt})
    if user_prompt:
        built.append({"role": "user", "content": user_prompt})
    return built


def _call_groq(messages: list[dict[str, str]], temperature: float, max_tokens: int, response_format: Optional[dict]) -> str:
    """Tentative 1 : API Cloud principale (Groq)."""
    import openai

    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY absente de l'environnement.")

    client = openai.OpenAI(base_url=GROQ_BASE_URL, api_key=GROQ_API_KEY)
    logger.info(f"[Completion] Tentative principale → Groq ({GROQ_MODEL})")

    kwargs: dict[str, Any] = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "timeout": CLOUD_TIMEOUT_PRIMARY,
    }
    if response_format is not None:
        kwargs["response_format"] = response_format

    response = client.chat.completions.create(**kwargs)
    return response.choices[0].message.content


def _call_together(messages: list[dict[str, str]], temperature: float, max_tokens: int, response_format: Optional[dict]) -> str:
    """Tentative 2 : API Cloud secondaire (Together AI)."""
    import openai

    if not TOGETHER_API_KEY:
        raise RuntimeError("TOGETHER_API_KEY absente de l'environnement.")

    client = openai.OpenAI(base_url=TOGETHER_BASE_URL, api_key=TOGETHER_API_KEY)
    logger.info(f"[Completion] Bascule → Together AI ({TOGETHER_MODEL})")

    kwargs: dict[str, Any] = {
        "model": TOGETHER_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "timeout": CLOUD_TIMEOUT_SECONDARY,
    }
    if response_format is not None:
        kwargs["response_format"] = response_format

    response = client.chat.completions.create(**kwargs)
    return response.choices[0].message.content


def _call_ollama(messages: list[dict[str, str]], response_format: Optional[dict]) -> Optional[str]:
    """Tentative 3 : repli local Ollama (mode On-Premise / hors-ligne)."""
    prompt = "\n\n".join(m["content"] for m in messages)

    payload: dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.2},
    }
    if response_format is not None:
        payload["format"] = "json"

    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json=payload,
            timeout=OLLAMA_TIMEOUT,
        )
        response.raise_for_status()
        logger.info("[Completion] Repli local → Ollama (Mistral/Llama)")
        return response.json().get("response")
    except Exception as exc:  # noqa: BLE001 - repli volontairement large
        logger.warning(f"[Completion] Ollama local indisponible : {exc}")
        return None


def complete(
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
    messages: Optional[list[dict[str, str]]] = None,
    response_format: Optional[dict] = None,
    temperature: float = 0.2,
    max_tokens: int = 2048,
) -> str:
    """Exécute la chaîne de complétion avec bascule automatique.

    Retourne le texte brut produit par le premier fournisseur qui répond.
    """
    built = _build_prompts(system_prompt, user_prompt, messages)

    attempts = [
        ("Groq", lambda: _call_groq(built, temperature, max_tokens, response_format)),
        ("Together AI", lambda: _call_together(built, temperature, max_tokens, response_format)),
    ]

    for name, attempt in attempts:
        try:
            return attempt()
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"[Completion] Échec {name} ({type(exc).__name__}: {exc}) — bascule immédiate.")

    # Repli local : Ollama
    local = _call_ollama(built, response_format)
    if local is not None:
        return local

    raise RuntimeError("Aucun fournisseur LLM disponible (Groq, Together AI et Ollama ont tous échoué).")


def complete_json(
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
    messages: Optional[list[dict[str, str]]] = None,
    temperature: float = 0.2,
    max_tokens: int = 2048,
    fallback: Optional[dict] = None,
) -> dict:
    """Version JSON forcée : parse `response_format={"type": "json_object"}`.

    En cas d'échec complet de la chaîne, retourne `fallback` si fourni,
    sinon lève une exception.
    """
    try:
        raw = complete(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return json.loads(raw)
    except Exception as exc:  # noqa: BLE001
        logger.error(f"[Completion] Échec de la chaîne JSON : {exc}")
        if fallback is not None:
            return fallback
        raise


def _deterministic_embedding(text: str) -> list[float]:
    """Vecteur factice 768-d, déterministe, DÉRIVÉ D'UN HACHAGE.

    ⚠️ Ce vecteur n'a AUCUNE relation sémantique avec le texte. Deux documents
    sans rapport ont autant de chances d'être proches que deux documents
    proches. Il ne sert qu'à remplir une colonne pour que le développement
    local ne casse pas ; il ne doit jamais être persisté ni interrogé.

    Conséquence si on l'acceptait en production : la recherche sémantique
    renverrait des passages arbitraires, avec des scores de similarité
    crédibles — le pire mode de défaillance possible pour un outil qui prétend
    citer ses sources. D'où le choix de renvoyer `None` par défaut.
    """
    dim = EMBEDDING_DIM
    vector: list[float] = []
    for i in range(dim):
        h = hashlib.sha256(f"{i}:{text}".encode("utf-8")).hexdigest()
        vector.append((int(h[:8], 16) / 0xFFFFFFFF) - 0.5)
    return vector


EMBEDDING_PREFIXES = {
    "document": "search_document: ",
    "query": "search_query: ",
}


def embed(text: str, allow_deterministic_fallback: bool = False, input_type: str = "document") -> list[float] | None:
    """Génère un embedding via Ollama (nomic-embed-text).

    Renvoie `None` si aucun service d'embedding ne répond. L'appelant bascule alors
    en recherche lexicale, ce qui est le comportement correct : une recherche
    plein texte juste vaut mieux qu'une similarité calculée sur du bruit.

    Le repli par hachage existe encore, mais seulement si on le demande
    explicitement (`allow_deterministic_fallback=True`) : c'est un outil de mise
    au point, pas une stratégie de production. Par défaut il est désactivé, donc
    un embedding sans sens ne peut pas se glisser en base par inadvertance.

    `input_type` distingue ce que l'on indexe de ce que l'on cherche.
    `nomic-embed-text` est entraîné sur deux tâches distinctes et n'obtient de
    bonnes similarités qu'avec son préfixe : sans lui, un texte et sa question
    se retrouvent dans des espaces non comparables, les scores tombent vers 0 et
    le classement devient quelconque — le pire résultat possible, car il a
    l'air d'une réponse.
    """
    prefixe = EMBEDDING_PREFIXES.get(input_type, EMBEDDING_PREFIXES["document"])
    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": EMBEDDING_MODEL, "prompt": prefixe + text[:8000]},
            timeout=float(os.environ.get("EMBEDDING_TIMEOUT", "30")),
        )
        response.raise_for_status()
        embedding = response.json().get("embedding")
        if embedding:
            logger.info(f"[Embeddings] Générés via Ollama ({len(embedding)} dimensions, type={input_type})")
            return embedding
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"[Embeddings] Ollama indisponible, aucune sémantique : {exc}")

    if allow_deterministic_fallback:
        logger.warning("[Embeddings] Repli factice activé explicitement : vecteur sans valeur sémantique.")
        return _deterministic_embedding(text)
    return None