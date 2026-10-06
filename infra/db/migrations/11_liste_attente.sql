-- =====================================================================================
-- 11 — LISTE D'ATTENTE ET DEMANDES DE DÉMONSTRATION (PRÉ-LANCEMENT)
-- =====================================================================================
-- Les formulaires publics du site (landing + pré-lancement) se contentaient
-- d'afficher un résultat calculé dans le navigateur : aucune ligne n'arrivait
-- en base. Ces deux tables sont le dépôt réel de ces formulaires.
--
-- Volontairement hors tenant : un visiteur n'a ni compte ni entreprise. La
-- position dans la file n'est pas stockée — elle se recalcule à la lecture
-- (rang d'arrivée + boost de parrainage), ce qui évite qu'une colonne dérive
-- de la réalité après un import ou un appel direct en base.
--
-- Le script est rejouable (IF NOT EXISTS partout).
-- =====================================================================================

CREATE TABLE IF NOT EXISTS "liste_attente" (
    "id"            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "prenom"        TEXT        NOT NULL,
    "email"         TEXT        NOT NULL,
    "entreprise"    TEXT,
    "code_parrain"  TEXT        NOT NULL,
    "parrain_id"    TEXT,
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "liste_attente_parrain_fk"
        FOREIGN KEY ("parrain_id") REFERENCES "liste_attente" ("id") ON DELETE SET NULL
);

-- Une adresse = une inscription. C'est la barrière anti-spam la plus solide
-- (le pot de miel et la limitation de débit n'agissent qu'en surface).
CREATE UNIQUE INDEX IF NOT EXISTS "liste_attente_email_key"       ON "liste_attente" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "liste_attente_code_parrain_key" ON "liste_attente" ("code_parrain");
CREATE INDEX IF NOT EXISTS "liste_attente_parrain_id_idx"          ON "liste_attente" ("parrain_id");

CREATE TABLE IF NOT EXISTS "demandes_demo" (
    "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "prenom"      TEXT        NOT NULL,
    "nom"         TEXT        NOT NULL,
    "email"       TEXT        NOT NULL,
    "telephone"   TEXT        NOT NULL,
    "entreprise"  TEXT        NOT NULL,
    "formule"     TEXT        NOT NULL,
    "message"     TEXT,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- La formule ne peut être qu'une des cinq options réellement proposées : une
-- écriture directe en base ne peut pas inventer un palier qui n'existe pas.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'demandes_demo_formule_check') THEN
        ALTER TABLE "demandes_demo" ADD CONSTRAINT "demandes_demo_formule_check" CHECK (
            "formule" IN (
                'Freemium (0 F)',
                'Starter (9 900 F/mois)',
                'Pro (24 900 F/mois)',
                'Business (54 900 F/mois)',
                'Cabinet comptable / Déploiement groupé'
            )
        );
    END IF;
END $$;