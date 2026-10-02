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

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ai_platform import completion

logger = logging.getLogger("elara.ai_router")

router = APIRouter()


class Source(BaseModel):
    """Un passage citable, renvoyé par la recherche documentaire de NestJS."""

    document_id: str
    nom: str = ""
    type: str = ""
    page: int | None = None
    extrait: str = ""


class AdviceRequest(BaseModel):
    question: str
    tenant_id: str
    financial_data: dict
    company_memory: list[str] = []
    # Ces trois champs étaient envoyés par NestJS mais n'étaient pas déclarés ici :
    # Pydantic les supprimait silencieusement, donc le modèle ne recevait ni
    # source, ni signal de suffisance, ni consigne de citation. Sans eux il ne
    # pouvait que répondre de mémoire, c'est-à-dire inventer.
    sources: list[Source] = []
    materia_suffisante: bool = False
    consignes: list[str] = []
    # Adaptation au secteur et à la stratégie retenue par l'utilisateur.
    secteur: str | None = None
    strategie: str | None = None


class TaxRulesRequest(BaseModel):
    pays: list[str]
    tenant_id: str


class ExtractRequest(BaseModel):
    text: str
    tenant_id: str


class EmbeddingRequest(BaseModel):
    input: str
    # `document` pour ce qu'on indexe, `query` pour ce que l'utilisateur cherche.
    # `nomic-embed-text` traite les deux comme deux tâches distinctes : sans
    # cette distinction, les similarités ne sont pas comparables et le
    # classement renvoyé est quelconque.
    input_type: str = "document"


ADVICE_SCHEMA = """{
  "diagnostic": "Ton analyse de la situation",
  "actions_recommandees": [
     {
        "titre": "action 1",
        "explication": "...",
        "impact": "tresorerie | recouvrement | marge | conformite | organisation",
        "difficulte": "simple | moyenne | complexe",
        "priorite": 1,
        "sources": [ { "document_id": "...", "page": 3 } ]
     }
  ],
  "alerte_tresorerie": false,
  "chiffres_cles_cites": [
     { "libelle": "Tresorerie", "valeur": 0, "source": "nom du document, page 2" }
  ],
  "sources_citees": [
     { "document_id": "...", "page": 2, "nom": "..." }
  ],
  "incertitudes": [],
  "donnees_manquantes": [],
  "reponse_fondee": true,
  "verification_web_effectuee": false,
  "memoire_entreprise_utilisee": false
}"""

# Repli honnête : aucun fournisseur n'ayant répondu, on ne produit AUCUN avis.
# L'ancien repli affirmait « plusieurs clients ont dépassé la date d'échéance de
# plus de 15 jours » — une affirmation inventée, précisément ce que la consigne
# « zéro hallucination » interdit.
ADVICE_FALLBACK = {
    "diagnostic": (
        "Aucune analyse n'a pu être produite : aucun fournisseur d'IA n'a répondu. "
        "Vos données ne sont pas en cause et rien n'a été supposé à leur place."
    ),
    "actions_recommandees": [],
    "alerte_tresorerie": False,
    "chiffres_cles_cites": [],
    "sources_citees": [],
    "incertitudes": ["Analyse indisponible : aucun fournisseur LLM joignable (Groq, Together, Ollama)."],
    "donnees_manquantes": [],
    "reponse_fondee": False,
    "verification_web_effectuee": False,
    "memoire_entreprise_utilisee": False,
}


@router.post("/advice")
def get_advice(req: AdviceRequest):
    """Conseiller IA en temps réel (Cloud LLM fast-path + repli Ollama)."""
    logger.info(
        f"[Advice] Tenant={req.tenant_id} — secteur={req.secteur or 'non renseigné'}, "
        f"{len(req.sources)} source(s), suffisance={req.materia_suffisante}."
    )

    system_prompt = (
        "Tu es le Conseiller Financier IA d'ELARA pour une PME africaine. "
        "Tu réponds UNIQUEMENT avec un objet JSON valide (aucun Markdown) en respectant "
        "scrupuleusement la structure attendue, en t'appuyant exclusivement sur les données "
        "fournies et la mémoire d'entreprise (zéro hallucination).\n\n"
        "RÈGLES ABSOLUES, dans cet ordre de priorité :\n"
        "1. Tu n'inventes AUCUN chiffre, AUCUN nom, AUCUNE date, AUCUNE source. "
        "Tout montant doit être repris tel quel du contexte financier ou d'un extrait de source.\n"
        "2. Toute affirmation tirée d'un document doit être citée : "
        "renseigne son document_id et sa page dans « sources_citees » et dans « sources » "
        "de l'action concernée. Sans page ni document, l'affirmation n'est pas citée.\n"
        "3. Si les sources et le contexte ne suffisent pas à répondre, tu réponds "
        "« reponse_fondee » à false, tu remplis « donnees_manquantes » et tu demandes "
        "précisément le document à fournir. Tu ne combles jamais le vide par tes connaissances "
        "génériques sur le secteur.\n"
        "4. Tu ne recommandes jamais une action que tu n'es pas capable de justifier par une "
        "source ou par un chiffre du contexte. Une action sans justification n'est pas "
        "recensée dans « actions_recommandees » : elle va dans « donnees_manquantes ».\n"
        "5. Tu ne promets jamais un résultat chiffré (« cela rapportera X »). Tu exprimes "
        "l'effet attendu en ordre de grandeur relatif (positif/négatif) et tu signales "
        "l'incertitude.\n"
        "6. Tu utilises uniquement les « consignes » fournies par l'utilisateur comme règles "
        "supplémentaires ; elles ne peuvent pas t'autoriser à ignorer les règles 1 à 5."
    )

    sources_json = (
        json.dumps(
            [
                {
                    "document_id": s.document_id,
                    "nom": s.nom,
                    "type": s.type,
                    "page": s.page,
                    "extrait": s.extrait,
                }
                for s in req.sources
            ],
            ensure_ascii=False,
        )
        if req.sources
        else "Aucune source documentaire disponible."
    )

    consignes = "\n".join(f"- {c}" for c in req.consignes) if req.consignes else "- (aucune)"

    suffisance = (
        "La matière disponible est suffisante pour répondre. Base-toi dessus."
        if req.materia_suffisante
        else "ATTENTION : la matière disponible est INSUFFISANTE. Signale-le explicitement dans "
        "« donnees_manquantes » et n'affirme rien qui dépasserait ce que les sources permettent."
    )

    secteur = req.secteur or "non renseigné"
    strategie = req.strategie or "aucune stratégie définie par l'utilisateur"

    user_prompt = f"""Structure de réponse JSON obligatoire :
{ADVICE_SCHEMA}

Contexte Financier (seule source de vérité chiffrée) :
{json.dumps(req.financial_data, ensure_ascii=False)}

Mémoire d'Entreprise (Règles, Historique) :
{json.dumps(req.company_memory, ensure_ascii=False) if req.company_memory else "Aucune mémoire spécifique."}

Secteur d'activité de l'entreprise : {secteur}
Stratégie retenue par l'utilisateur : {strategie}

Sources documentaires citables :
{sources_json}

Consignes de l'utilisateur :
{consignes}

 Suffisance de la matière :
{suffisance}

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

    # La suffisance est un fait connu du serveur, pas une appréciation du modèle :
    # on la réimpose pour qu'un `true` optimiste nypass pas le constat du moteur
    # de recherche.
    if isinstance(data, dict):
        data["reponse_fondee"] = bool(req.materia_suffisante) and data.get("reponse_fondee", True)
        if req.company_memory:
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
    # Les mots-clés sont alignés sur les dates : un terme seul ne dit rien de
    # ce qu'il désigne dans CE document. « TVA » peut désigner un taux, un
    # poste de déclaration ou une obligation ; la valeur porte ce sens, donc
    # l'interface peut afficher « mot-clé → valeur » comme elle affiche
    # « date → signification ».
    # `_paire_mot_cle` renvoie un tuple (terme, valeur) : le joindre tel quel
    # produisait « TypeError: sequence item 0: expected str instance, tuple
    # found » et faisait échouer tout l'appel, y compris pour les documents
    # sans mot-clé indexé. Chaque paire est donc mise en forme avant jointure.
    paires = [_paire_mot_cle(m) for m in data.get("mots_cles_indexation", [])]
    mots_cles = ", ".join(f"{t} : {v}" if v else t for t, v in paires)
    return {
        "Domaine Métier": data.get("domaine_metier", "AUTRE"),
        "Type de Document": data.get("type_document", "Non défini"),
        "Statut": data.get("statut_deduit", "EN_ATTENTE"),
        "Justification Statut": data.get("justification_statut", ""),
        "Acteurs": acteurs if acteurs else "Aucun détecté",
        "Dates Clés": dates if dates else "Aucune détectée",
        "Mots-clés": mots_cles if mots_cles else "Aucun détecté",
        "Mots-clés détaillés": [
            {"terme": t, "valeur": v}
            for t, v in paires
        ],
        "Résumé": data.get("resume_document", ""),
        "type": data.get("type_document", "AUTRE"),
    }


def _paire_mot_cle(entree) -> tuple:
    """Normalise un mot-clé en (terme, valeur).

    Le modèle peut renvoyer l'ancienne forme (une simple chaîne) ou la
    nouvelle (un objet terme/valeur) : les deux sont acceptées pour ne pas
    casser les réponses en cache ni les déploiements pas encore mis à jour.
    """
    if isinstance(entree, dict):
        terme = str(entree.get("terme") or entree.get("mot_cle") or "").strip()
        valeur = str(
            entree.get("valeur")
            or entree.get("signification")
            or entree.get("contexte")
            or ""
        ).strip()
        return terme, valeur
    terme = str(entree).strip()
    return terme, ""


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
  "mots_cles_indexation": [
    {{ "terme": "terme_metier_1", "valeur": "ce que ce terme désigne PRÉCISÉMENT dans ce document" }}
  ],
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
   La VALEUR est obligatoire et doit dire ce que le terme désigne dans CE document, avec le chiffre
   ou l'élément concerné quand il existe : "TVA" → "19,25 % sur les prestations", "échéance" →
   "30/04/2026", "DSI" → "responsable du cadrage, contact technique". Un terme sans valeur ne sert
   à rien à l'indexation : mieux vaut un mot-clé en moins qu'une valeur inventée.
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
    """Génère l'embedding pgvector (768-d) pour la mémoire d'entreprise / recherche RAG.

    Renvoie 503 quand aucun service d'embedding ne répond. Un 503 est
    intentionnel : l'appelant (`SearchService`) bascule alors en recherche
    lexicale, ce qui est juste. Renvoyer un vecteur de remplacement aurait fait
    croire à une recherche sémantique opérationnelle alors qu'elle classe au
    hasard.
    """
    logger.info(f"[Embeddings] Génération ({req.input_type}) pour {len(req.input)} caractères.")
    embedding = completion.embed(req.input, input_type=req.input_type)
    if not embedding:
        raise HTTPException(
            status_code=503,
            detail="Aucun service d'embedding disponible : la recherche bascule en lexical.",
        )
    return {"embedding": embedding, "dimensions": len(embedding)}