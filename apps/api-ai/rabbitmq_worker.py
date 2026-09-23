"""Worker RabbitMQ — Shadow Processing (analyse d'ombre en tâche de fond).

Écoute la file `document_shadow_processing` publiée par api-nest après l'upload,
exécute le pipeline lourd SANS impacter l'utilisateur :
1. Téléchargement du document depuis MinIO (creds pilotées par l'environnement).
2. OCR lourd (PDF texte → pdfplumber, PDF scanné → rendu + RapidOCR, image → Tesseract).
3. Nettoyage + extraction JSON structurée via LLM hybride (Groq primaire, Ollama en secours).
4. Publication du résultat sur la file `scanner.document.traite` au format NestJS.
5. Retries automatiques (3 max) puis événement `status: ERROR` en cas d'échec définitif.
"""

from __future__ import annotations

import io
import json
import logging
import os
import tempfile
import time

import boto3
import pika
import pdfplumber
import pymupdf
import requests

from ai_platform import completion

logger = logging.getLogger("elara.rabbitmq_worker")

RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "mistral:latest")

MINIO_ENDPOINT_URL = os.environ.get("MINIO_ENDPOINT_URL", "http://localhost:9000")
MINIO_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET_NAME = os.environ.get("MINIO_BUCKET_NAME", "elara-documents")

# Mode filesystem local / On-Premise : répertoire partagé (volume Docker) où
# api-nest a déposé les documents (`DOCUMENTS_DIR`). Allège la base de données.
DOCUMENTS_DIR = os.environ.get("DOCUMENTS_DIR", "local-ged")

IN_QUEUE = os.environ.get("SHADOW_IN_QUEUE", "document_shadow_processing")
OUT_QUEUE = os.environ.get("SHADOW_OUT_QUEUE", "scanner.document.traite")

MAX_RETRIES = 3

# Le worker asynchrone a besoin de timeouts bien plus longs que les appels temps réel
# (le module completion.py utilise 5s/10s en prod Cloud et 60s pour Ollama).
completion.CLOUD_TIMEOUT_PRIMARY = float(os.environ.get("SHADOW_CLOUD_TIMEOUT_PRIMARY", "120"))
completion.CLOUD_TIMEOUT_SECONDARY = float(os.environ.get("SHADOW_CLOUD_TIMEOUT_SECONDARY", "120"))
completion.OLLAMA_TIMEOUT = float(os.environ.get("SHADOW_OLLAMA_TIMEOUT", "240"))

# Global variables for the connection
_connection = None
_channel = None


# ---------------------------------------------------------------------------
# Téléchargement MinIO
# ---------------------------------------------------------------------------
def _s3_client():
    from botocore.client import Config

    return boto3.client(
        "s3",
        endpoint_url=MINIO_ENDPOINT_URL,
        aws_access_key_id=MINIO_ACCESS_KEY,
        aws_secret_access_key=MINIO_SECRET_KEY,
        config=Config(signature_version="s3v4"),
        region_name=os.environ.get("MINIO_REGION", "us-east-1"),
    )


def _object_name_from_url(file_url: str) -> str:
    marker = f"/{MINIO_BUCKET_NAME}/"
    if marker in file_url:
        return file_url.split(marker)[1]
    return file_url


def _download_from_local(file_url: str) -> bytes:
    """Lit un document déposé sur le système de fichiers partagé (local://).

    Fonctionne aussi bien en local qu'en conteneur Docker : le répertoire
    `DOCUMENTS_DIR` est monté en volume partagé entre api-nest (qui écrit) et
    api-ai (worker shadow qui lit). Les fichiers sont organisés par tenant.
    """
    if not file_url.startswith("local://"):
        raise ValueError(f"URL non locale : {file_url}")

    rel_path = file_url[len("local://"):].lstrip("/")
    abs_path = os.path.join(DOCUMENTS_DIR, rel_path)
    if not os.path.isfile(abs_path):
        raise FileNotFoundError(f"Fichier local introuvable : {abs_path}")
    with open(abs_path, "rb") as handle:
        return handle.read()


def _download_from_minio(file_url: str) -> bytes:
    """Télécharge le document depuis le système de fichiers OU MinIO/HTTP."""
    if file_url.startswith("local://"):
        try:
            logger.info(f"[Worker] Lecture du document depuis le système de fichiers : {file_url}")
            return _download_from_local(file_url)
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"[Worker] Lecture locale échouée ({exc}), tentative HTTP.")
            try:
                response = requests.get(file_url, timeout=60)
                response.raise_for_status()
                return response.content
            except Exception as http_exc:  # noqa: BLE001
                raise http_exc from exc
    try:
        obj = _s3_client().get_object(Bucket=MINIO_BUCKET_NAME, Key=_object_name_from_url(file_url))
        return obj["Body"].read()
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"[Worker] Téléchargement MinIO échoué ({exc}), tentative via HTTP.")
        response = requests.get(file_url, timeout=60)
        response.raise_for_status()
        return response.content


# ---------------------------------------------------------------------------
# OCR
# ---------------------------------------------------------------------------
def _extract_pdf_text(file_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        pages = [page.extract_text() for page in pdf.pages]
    return "\n".join(t for t in pages if t)


def _ocr_image(file_bytes: bytes) -> str:
    """OCR natif Tesseract (français + anglais) sur une image."""
    from PIL import Image
    import pytesseract

    with Image.open(io.BytesIO(file_bytes)) as img:
        return pytesseract.image_to_string(img, lang="fra+eng")


def _process_scanned_pdf(file_bytes: bytes, doc_id: str, tenant_id: str) -> str:
    """OCR visuel d'un PDF scanné : rendu PyMuPDF + RapidOCR parallèle."""
    try:
        from rapidocr_onnxruntime import RapidOCR
        import concurrent.futures

        logger.info("[Worker] PDF semble vide, OCR visuel natif (RapidOCR)...")
        ocr = RapidOCR()
        pages_text: list[str] = []

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as f_pdf:
            f_pdf.write(file_bytes)
            pdf_temp_path = f_pdf.name

        doc = pymupdf.open(pdf_temp_path)
        total_pages = len(doc)

        png_paths = []
        for i, page in enumerate(doc):
            pix = page.get_pixmap(dpi=300)
            f_png = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
            temp_png_path = f_png.name
            f_png.close()
            pix.save(temp_png_path)
            png_paths.append((i, temp_png_path))
        doc.close()

        pages_text = [""] * total_pages
        completed = 0

        def process_page(item):
            index, png_path = item
            try:
                result, _ = ocr(png_path)
                return index, "\n".join(res[1] for res in result) if result else ""
            except Exception as exc:  # noqa: BLE001
                logger.warning(f"[Worker] Erreur RapidOCR page {index}: {exc}")
                return index, ""
            finally:
                try:
                    os.remove(png_path)
                except OSError:
                    pass

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = {executor.submit(process_page, item): item for item in png_paths}
            for future in concurrent.futures.as_completed(futures):
                index, text = future.result()
                pages_text[index] = text
                completed += 1
                _publish_progress(
                    doc_id, tenant_id,
                    int((completed / total_pages) * 100),
                    f"Analyse OCR ultra-rapide ({completed}/{total_pages} pages)...",
                )

        _publish_progress(doc_id, tenant_id, 100, "Finalisation de l'analyse IA...")
        try:
            os.remove(pdf_temp_path)
        except OSError:
            pass
        return "\n".join(pages_text)
    except Exception as exc:  # noqa: BLE001
        logger.error(f"[Worker] Échec de l'OCR visuel de secours : {exc}")
        return ""


def _extract_text(mime_type: str, file_bytes: bytes, doc_id: str, tenant_id: str) -> str:
    """Routeur OCR selon le type MIME (avec repli multi-étages)."""
    if "pdf" in mime_type.lower():
        text = _extract_pdf_text(file_bytes)
        if len(text.strip()) < 20:
            text = _process_scanned_pdf(file_bytes, doc_id, tenant_id)
        return text
    if "image" in mime_type.lower():
        return _ocr_image(file_bytes)
    # Autres formats (docx, txt...) : extraction brute
    return file_bytes.decode("utf-8", errors="ignore")


# ---------------------------------------------------------------------------
# IA hybride (Groq primaire → Ollama secours) — nettoyage + Shadow Processing
# ---------------------------------------------------------------------------
def _llm_generate(
    user_prompt: str,
    system_prompt: str = "",
    json_mode: bool = False,
    max_tokens: int = 2048,
) -> str:
    """Génère une réponse via la chaîne hybride `ai_platform.completion`.

    Groq (JSON natif) en primaire, Together AI en secondaire, et Ollama local
    uniquement en dernier recours (hors-ligne / indisponibilité Cloud).
    """
    return completion.complete(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        response_format={"type": "json_object"} if json_mode else None,
        temperature=0.2,
        max_tokens=max_tokens,
    )


def _clean_ocr_text(extracted_text: str) -> str:
    """Étape 1 : correction du texte OCR brut par l'IA (Groq → secours)."""
    logger.info("[Worker] Étape 1: Nettoyage du texte OCR par l'IA (Groq → secours)...")
    prompt = f"""Tu es un assistant expert. Voici un texte issu d'une reconnaissance optique de caractères (OCR).
Corrige les fautes d'orthographe, les erreurs de scan, et formate le texte pour qu'il soit propre et facile à lire.
Ne rajoute aucune information, contente-toi de corriger le texte brut.

Texte brut :
{extracted_text[:3500]}"""
    try:
        cleaned = (_llm_generate(prompt, max_tokens=2048) or "").strip()
        return cleaned or extracted_text
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"[Worker] Erreur lors du nettoyage OCR : {exc}")
        return extracted_text


def _shadow_extract(clean_text: str) -> dict:
    """Étape 2 : extraction JSON structurée (GED / métriques / risques)."""
    logger.info("[Worker] Étape 2: Extraction JSON et Shadow Processing (Groq → secours)...")
    prompt = f"""Tu es une Intelligence Artificielle d'élite, experte mondiale en Management de toutes les fonctions de l'entreprise (Finance, RH, Juridique, Logistique, etc.) et en GED (Shadow Processing).
Voici le texte brut d'un document. Tu dois en extraire les informations clés pour la GED.
Réponds UNIQUEMENT avec un JSON strict respectant cette structure exacte :
{{
  "domaine_metier": "FINANCE_COMPTABILITE | RESSOURCES_HUMAINES | JURIDIQUE | LOGISTIQUE_SUPPLY_CHAIN | COMMERCIAL_VENTES | DIRECTION_GENERALE | AUTRE",
  "type_document": "Facture Proforma, Contrat, Fiche de paie, Devis, etc.",
  "statut_deduit": "A_VALIDER | SIGNE | EXPIRE | LITIGE | BROUILLON | EN_ATTENTE | ...",
  "justification_statut": "Pourquoi ce statut ?",
  "acteurs_impliques": [
    {{ "nom": "...", "role": "Fournisseur, Client, Employé...", "identifiant": "SIRET/NIU..." }}
  ],
  "dates_cles": [
    {{ "date": "YYYY-MM-DD", "signification": "Date d'émission, échéance..." }}
  ],
  "mots_cles_indexation": ["mot1", "mot2", "mot3"],
  "resume_document": "Résumé court",
  "montant_ht": 0.0,
  "montant_ttc": 0.0,
  "niveau_risque_fraude": 0
}}
Texte: {clean_text[:2500]}
"""
    raw = _llm_generate(prompt, json_mode=True, max_tokens=2048).strip()
    if not raw:
        raise RuntimeError("Réponse du LLM vide (aucun fournisseur LLM disponible).")
    try:
        data = json.loads(raw) or {}
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"JSON généré par le LLM invalide : {exc}") from exc

    acteurs = ", ".join(
        [f"{a.get('nom', '')} ({a.get('role', '')})" for a in data.get("acteurs_impliques", [])]
    )
    dates = ", ".join(
        [f"{d.get('date', '')} ({d.get('signification', '')})" for d in data.get("dates_cles", [])]
    )
    type_doc = data.get("type_document", "AUTRE")
    display = {
        "Domaine Métier": data.get("domaine_metier", "AUTRE"),
        "Type de Document": type_doc,
        "Statut": data.get("statut_deduit", "EN_ATTENTE"),
        "Justification Statut": data.get("justification_statut", ""),
        "Acteurs": acteurs if acteurs else "Aucun détecté",
        "Dates Clés": dates if dates else "Aucune détectée",
        "Mots-clés": ", ".join(data.get("mots_cles_indexation", [])),
        "Résumé": data.get("resume_document", ""),
        "Montant HT": data.get("montant_ht"),
        "Montant TTC": data.get("montant_ttc"),
        "Risque Fraude": data.get("niveau_risque_fraude"),
        "type": type_doc,  # Compatibilité descendante
    }

    # Schéma structuré attendu par api-nest (handleDocumentProcessed)
    acteurs_list = data.get("acteurs_impliques", [])
    fournisseur = next(
        (a for a in acteurs_list if "fournisseur" in str(a.get("role", "")).lower()),
        acteurs_list[0] if acteurs_list else {},
    )
    dates_cles = data.get("dates_cles", [])

    def _valid_date(value):
        """Retourne une date ISO 'YYYY-MM-DD' valide, sinon None (évite les dates LLM aberrantes)."""
        from datetime import datetime as _dt
        if not value:
            return None
        s = str(value).strip()
        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y", "%d-%m-%Y"):
            try:
                return _dt.strptime(s, fmt).date().isoformat()
            except ValueError:
                continue
        return None

    date_emission = next(
        (
            _valid_date(d.get("date"))
            for d in dates_cles
            if _valid_date(d.get("date")) and "mission" in str(d.get("signification", "")).lower()
        ),
        None,
    )
    date_echeance = next(
        (
            _valid_date(d.get("date"))
            for d in dates_cles
            if _valid_date(d.get("date")) and "ch" in str(d.get("signification", "")).lower()
        ),
        None,
    )
    extraction = {
        "nom_fournisseur": fournisseur.get("nom"),
        "niu_fournisseur": fournisseur.get("identifiant"),
        "rccm_fournisseur": None,
        "numero_facture": None,
        "categorie": type_doc,
        "montant_ht": data.get("montant_ht"),
        "taux_tva": None,
        "montant_tva": None,
        "montant_total": data.get("montant_ttc") or data.get("montant_ht"),
        "date_emission": date_emission,
        "date_echeance": date_echeance,
        "niveau_risque_fraude": data.get("niveau_risque_fraude") or 0,
        "mots_cles": data.get("mots_cles_indexation", []),
        "resume": data.get("resume_document", ""),
    }
    return {"display": display, "extraction": extraction}


# ---------------------------------------------------------------------------
# Publication des résultats
# ---------------------------------------------------------------------------
def _publish_progress(doc_id: str, tenant_id: str, progress: int, message: str) -> None:
    payload = {
        "pattern": "scanner.document.progress",
        "data": {"document_id": doc_id, "tenant_id": tenant_id, "progress": progress, "message": message},
    }
    _publish(payload)


def _publish(payload: dict) -> None:
    """Publie un message au format NestJS Microservices ({ pattern, data })."""
    if _channel is None or not _channel.is_open:
        logger.warning("[Worker] Channel RabbitMQ indisponible — résultat perdu.")
        return
    _channel.basic_publish(
        exchange="",
        routing_key=OUT_QUEUE,
        body=json.dumps(payload),
        properties=pika.BasicProperties(delivery_mode=2),
    )


def process_document(ch, method, properties, body):
    msg = None
    try:
        msg = json.loads(body)
        logger.info(f"[Worker] Reçu document_shadow_processing : {msg}")

        doc_id = msg.get("document_id")
        file_url = msg.get("file_url")
        tenant_id = msg.get("tenant_id")
        mime_type = msg.get("mime_type", "application/pdf")

        logger.info(f"[Worker] Téléchargement depuis {file_url}")
        file_bytes = _download_from_minio(file_url)

        # OCR lourd (avec repli visuel)
        extracted_text = _extract_text(mime_type, file_bytes, doc_id, tenant_id)
        if not extracted_text.strip():
            extracted_text = "Erreur OCR: Impossible de lire le document."

        # Étape 1 : nettoyage IA locale
        clean_text = _clean_ocr_text(extracted_text)

        # Étape 2 : Shadow Processing (extraction structurée)
        shadow = _shadow_extract(clean_text)
        display_data = shadow["display"]
        extraction_data = shadow["extraction"]

        response_msg = {
            "document_id": doc_id,
            "tenant_id": tenant_id,
            "status": "COMPLETED",
            "type_document": (extraction_data.get("categorie") or "AUTRE").lower(),
            "score_confiance": 0.95,
            "extraction": extraction_data,
            "extracted_data": display_data,
            "ocr_text": extracted_text,
        }

        # Format d'échange attendu par NestJS Microservices
        _publish({"pattern": "scanner.document.traite", "data": response_msg})
        logger.info(f"[Worker] Document {doc_id} traité et publié sur {OUT_QUEUE}")
        _safe_ack(ch, method)

    except Exception as exc:  # noqa: BLE001
        retries = int((properties.headers or {}).get("x-retries", 0) or 0)
        doc_id = (msg or {}).get("document_id")
        tenant_id = (msg or {}).get("tenant_id")
        logger.error(f"[Worker] Erreur traitement document {doc_id} : {exc}")
        if retries < MAX_RETRIES:
            _republish_for_retry(ch, method, properties, body, retries + 1)
            return
        logger.error(f"[Worker] Document {doc_id} définitivement en échec après {MAX_RETRIES} tentatives — publication de l'événement ERROR.")
        error_payload = {
            "document_id": doc_id,
            "tenant_id": tenant_id,
            "status": "ERROR",
            "erreur": str(exc),
            "type_document": None,
            "score_confiance": 0,
            "extraction": {},
            "extracted_data": {"Analyse": "Échec de l'analyse", "Erreur": str(exc)},
            "ocr_text": "",
        }
        try:
            _publish({"pattern": "scanner.document.traite", "data": error_payload})
        except Exception as publish_exc:  # noqa: BLE001
            logger.error(f"[Worker] Impossible de publier l'événement ERROR : {publish_exc}")
        _safe_ack(ch, method)


def _republish_for_retry(ch, method, properties, body, retries):
    """Remet le message en file avec un compteur incrémenté (x-retries)."""
    headers = dict(properties.headers) if properties.headers else {}
    headers["x-retries"] = retries
    try:
        ch.basic_publish(
            exchange="",
            routing_key=IN_QUEUE,
            body=body,
            properties=pika.BasicProperties(
                delivery_mode=2,
                headers=headers or None,
            ),
        )
        _safe_ack(ch, method)
        logger.info(f"[Worker] Document relancé (tentative {retries}/{MAX_RETRIES}).")
    except Exception as exc:  # noqa: BLE001
        logger.error(f"[Worker] Impossible de réinsérer le message : {exc}")
        try:
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
        except Exception:  # noqa: BLE001
            pass


def _safe_ack(ch, method_or_tag):
    delivery_tag = getattr(method_or_tag, "delivery_tag", method_or_tag)
    try:
        ch.basic_ack(delivery_tag=delivery_tag)
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"[Worker] Ack échoué (tag={delivery_tag}) : {exc}")


# ---------------------------------------------------------------------------
# Connexion + boucle de consommation (avec reconnexion automatique)
# ---------------------------------------------------------------------------
def start_worker():
    global _connection, _channel
    retry = 0
    while True:
        try:
            parameters = pika.URLParameters(RABBITMQ_URL)
            # Les tâches OCR + LLM dépassent largement le heartbeat AMQP par défaut (60s) ;
            # sans cela RabbitMQ coupe la connexion en plein traitement (« Connection reset by peer »).
            if parameters.heartbeat is None or parameters.heartbeat < 600:
                parameters.heartbeat = 600
            parameters.socket_timeout = 60
            parameters.blocked_connection_timeout = 300
            _connection = pika.BlockingConnection(parameters)
            _channel = _connection.channel()

            # Déclarer les files
            _channel.queue_declare(queue=IN_QUEUE, durable=True)
            _channel.queue_declare(queue=OUT_QUEUE, durable=True)

            _channel.basic_qos(prefetch_count=1)
            _channel.basic_consume(queue=IN_QUEUE, on_message_callback=process_document)

            logger.info(f"[Worker] En attente de messages sur '{IN_QUEUE}'.")
            _channel.start_consuming()
        except Exception as exc:  # noqa: BLE001
            retry += 1
            wait = min(2 ** min(retry, 6), 60)
            logger.error(f"[Worker] Erreur fatale RabbitMQ ({exc}) — reconnexion dans {wait}s.")
            try:
                if _connection and _connection.is_open:
                    _connection.close()
            except Exception:  # noqa: BLE001
                pass
            _connection = None
            _channel = None
            time.sleep(wait)


def stop_worker():
    global _connection, _channel
    try:
        if _channel and _channel.is_open:
            _channel.stop_consuming()
            _channel.close()
    except Exception:  # noqa: BLE001
        pass
    try:
        if _connection and _connection.is_open:
            _connection.close()
    except Exception:  # noqa: BLE001
        pass
    _channel = None
    _connection = None


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    start_worker()