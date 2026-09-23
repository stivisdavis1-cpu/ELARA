"""Router IA d'ELARA — conseiller financier, veille fiscale, extraction Cloud LLM.

Tous les appelle temps réel transitent par le compilateur hybride
(`ai_platform.completion`) qui applique la chaîne de bascule :
Groq (principal) → Together AI (secondaire) → Ollama (repli local).
Sortie forcée en JSON (`response_format={"type": "json_object"}`).
"""

from __future__ import annotations

import json
import logging
import os

from fastapi import APIRouter
from pydantic import BaseModel

from ai_platform import completion

logger = logging.getLogger("elara.ai_router")

router = APIRouter()


class AdviceRequest(BaseModel):
    question: str
    tenant_id: str
    financial_data: dict
    company_memory: list[str] = []


class TaxRulesRequest(BaseModel):
    pays: list[str]
    tenant_id: str


class ExtractRequest(BaseModel):
    text: str
    tenant_id: str


class EmbeddingRequest(BaseModel):
    input: str


ADVICE_SCHEMA = """{
  "diagnostic": "Ton analyse de la situation",
  "actions_recommandees": [
     { "titre": "action 1", "explication": "...", "impact": "tresorerie", "difficulte": "simple" }
  ],
  "alerte_tresorerie": false,
  "chiffres_cles_cites": [
     { "libelle": "Trésorerie", "valeur": 0 }
  ],
  "incertitudes": [],
  "verification_web_effectuee": false,
  "memoire_entreprise_utilisee": false
}"""

ADVICE_FALLBACK = {
    "diagnostic": "Vos finances sont globalement stables, mais une vigilance s'impose sur les prochains flux sortants.",
    "actions_recommandees": [
        {
            "titre": "Relancer les factures en attente",
            "explication": "Plusieurs clients ont dépassé la date d'échéance de plus de 15 jours.",
            "impact": "Trésorerie immédiate",
            "difficulte": "Simple",
        }
    ],
    "alerte_tresorerie": False,
    "chiffres_cles_cites": [],
    "incertitudes": ["Analyse simulée (aucun fournisseur LLM joignable)."],
    "verification_web_effectuee": False,
    "memoire_entreprise_utilisee": False,
}


@router.post("/advice")
def get_advice(req: AdviceRequest):
    """Conseiller IA en temps réel (Cloud LLM fast-path + repli Ollama)."""
    logger.info(f"[Advice] Tenant={req.tenant_id} — envoi à la chaîne Cloud LLM.")

    system_prompt = (
        "Tu es le Conseiller Financier IA d'ELARA pour une PME africaine. "
        "Tu réponds UNIQUEMENT avec un objet JSON valide (aucun Markdown) en respectant "
        "scrupuleusement la structure attendue, en t'appuyant exclusivement sur les données "
        "fournies et la mémoire d'entreprise (zéro hallucination)."
    )
    user_prompt = f"""Structeur de réponse JSON obligatoire :
{ADVICE_SCHEMA}

Contexte Financier :
{json.dumps(req.financial_data, ensure_ascii=False)}

Mémoire d'Entreprise (Règles, Historique) :
{json.dumps(req.company_memory, ensure_ascii=False) if req.company_memory else "Aucune mémoire spécifique."}

Question de l'utilisateur :
{req.question}
"""

    data = completion.complete_json(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.2,
        max_tokens=1200,
        fallback=ADVICE_FALLBACK,
    )
    if req.company_memory and "memoire_entreprise_utilisee" in data:
        data["memoire_entreprise_utilisee"] = True
    return data


@router.post("/tax-rules")
def get_tax_rules(req: TaxRulesRequest):
    """Agent fiscal — récupère les taux applicables par pays (Cloud LLM + repli)."""
    logger.info(f"[TaxRules] Tenant={req.tenant_id} — pays: {', '.join(req.pays)}.")

    system_prompt = (
        "Tu es un Agent Fiscal expert (OHADA / CEMAC / DGI Cameroun). "
        "Réponds UNIQUEMENT avec un objet JSON valide respectant la structure attendue."
    )
    user_prompt = f"""L'entreprise {req.tenant_id} opère dans les pays suivants : {', '.join(req.pays)}.

Structure JSON obligatoire :
{{
   "rules": [
      {{ "pays": "CM", "taux_tva_standard": 19.25, "description": "TVA standard au Cameroun (source DGI)" }}
   ]
}}

L'élément "pays" de chaque règle doit être le code ISO à deux lettres (ex: CM, CI, SN)."""

    return completion.complete_json(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.1,
        max_tokens=800,
        fallback={
            "rules": [
                {
                    "pays": country,
                    "taux_tva_standard": 19.25,
                    "description": "Taux récupéré via l'Agent (mode de secours local)",
                }
                for country in req.pays
            ]
        },
    )


def flatten_response(data: dict) -> dict:
    """Aplatit la sortie du modèle Cloud en métadonnées universelles GED."""
    acteurs = ", ".join(
        [f"{a.get('nom', '')} ({a.get('role', '')})" for a in data.get("acteurs_impliques", [])]
    )
    dates = ", ".join(
        [f"{d.get('date', '')} ({d.get('signification', '')})" for d in data.get("dates_cles", [])]
    )
    return {
        "Domaine Métier": data.get("domaine_metier", "AUTRE"),
        "Type de Document": data.get("type_document", "Non défini"),
        "Statut": data.get("statut_deduit", "EN_ATTENTE"),
        "Justification Statut": data.get("justification_statut", ""),
        "Acteurs": acteurs if acteurs else "Aucun détecté",
        "Dates Clés": dates if dates else "Aucune détectée",
        "Mots-clés": ", ".join(data.get("mots_cles_indexation", [])),
        "Résumé": data.get("resume_document", ""),
        "type": data.get("type_document", "AUTRE"),
    }


@router.post("/extract")
def extract_document(req: ExtractRequest):
    """Extraction immédiate (< 500 ms) via la chaîne Cloud LLM (failover Groq/Together)."""
    logger.info(f"[Extract] Tenant={req.tenant_id} — texte OCR ({len(req.text)} caractères).")

    system_prompt = (
        "Tu es l'Expert Métier du Business Scanner d'ELARA, une plateforme IA pour PME africaines. "
        "Tu maîtrises toutes les fonctions de l'entreprise (Finance, Commercial, RH, Juridique, "
        "Logistique, Production, Informatique/GED) et la GED d'entreprise. Tu analyses le texte OCR "
        "d'un document d'entreprise avec la rigueur d'un consultant fonctionnel : un lecteur non "
        "spécialiste doit comprendre immédiatement le type de document, son contexte métier, les "
        "acteurs, les échéances et l'action attendue. Réponds UNIQUEMENT avec un objet JSON valide, "
        "sans texte autour, en respectant scrupuleusement la structure demandée."
    )
    user_prompt = f"""Analyse le document d'entreprise ci-dessous et extrais-en les métadonnées.

Structure JSON obligatoire :
{{
  "domaine_metier": "FINANCE_COMPTABILITE | COMMERCIAL_VENTES | RESSOURCES_HUMAINES | JURIDIQUE_CONTRACTUEL | LOGISTIQUE_SUPPLY_CHAIN | PRODUCTION_OPERATIONS | INFORMATIQUE_GED | DIRECTION_GENERALE | ADMINISTRATION | AUTRE",
  "type_document": "type le plus précis (ex: Facture, Devis, Bon de commande, Contrat, Fiche de paie, Relevé bancaire, Document de travail / Cadrage métier, Compte-rendu, Note de synthèse, Cahier des charges, Rapport, Planning, Courrier administratif...)",
  "statut_deduit": "BROUILLON | A_VALIDER | SIGNE | VALIDE | EXPIRE | LITIGE | EN_ATTENTE | PAYE | ENVOYE | ANNULE | ...",
  "justification_statut": "1 phrase expliquant le statut déduit",
  "acteurs_impliques": [
    {{ "nom": "...", "role": "responsable projet, fournisseur, client, contact technique..." }}
  ],
  "dates_cles": [
    {{ "date": "YYYY-MM-DD", "signification": "émission, réunion, échéance, jalon..." }}
  ],
  "mots_cles_indexation": ["terme_metier_1", "terme_metier_2", "..."],
  "resume_document": "2 phrases : contenu + objet métier + action attendue"
}}

Règles d'expert métier :
1. TYPE DOCUMENT : identifie le type le plus précis possible, jamais générique si un type spécifique existe.
2. DOMAINE MÉTIER : déduis-le du contenu réel du texte, pas du seul titre.
3. MOTS-CLÉS : extrais 6 à 10 termes métier STRUCTURANTS et propres au type de document : outils/systèmes
   cités (ex: DocuWare, GED), processus (workflow, indexation, armoire), rôles (DSI, référent GED,
   responsable), livrables/jalons, références et sigles (ex: UBC, banque), entités citées. Jamais de
   mots vides (le, la, des, pour, document...). Chaque type a ses mots-clés caractéristiques :
   une facture → TVA, HT, TTC, NIU, échéance, paiement ; un contrat → parties, durée, résiliation,
   clause ; un document projet/GED → cadrage, périmètre, livrables, jalons, référentiel, outils, processus.
4. STATUT : déduis-le du contenu — document de travail, en projet, non signé → BROUILLON ;
   mention « à valider » → A_VALIDER ; signature/validation présente → SIGNE ou VALIDE ;
   échéance dépassée → EXPIRE ; litige/penalité mentionné → LITIGE ; paiement en attente → EN_ATTENTE.
5. ACTEURS : liste uniquement les personnes/entités réellement citées, avec leur rôle (ne rien inventer).
6. DATES : normalise chaque date en YYYY-MM-DD et précise sa signification (réunion, échéance, émission...).
7. RÉSUMÉ : 2 phrases exploitables (quoi, pourquoi, prochaine étape).
8. Retourne UNIQUEMENT le JSON.

Texte OCR :
{req.text[:8000]}"""

    raw = completion.complete_json(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.1,
        max_tokens=1500,
        fallback={
            "domaine_metier": "AUTRE",
            "type_document": "AUTRE",
            "statut_deduit": "EN_ATTENTE",
            "justification_statut": "Fournisseurs Cloud et repli local indisponibles.",
            "acteurs_impliques": [],
            "dates_cles": [],
            "mots_cles_indexation": [],
            "resume_document": "",
        },
    )
    return flatten_response(raw)


@router.post("/embeddings")
def generate_embeddings(req: EmbeddingRequest):
    """Génère l'embedding pgvector (768-d) pour la mémoire d'entreprise / recherche RAG."""
    logger.info(f"[Embeddings] Génération pour {len(req.input)} caractères.")
    embedding = completion.embed(req.input)
    return {"embedding": embedding, "dimensions": len(embedding)}