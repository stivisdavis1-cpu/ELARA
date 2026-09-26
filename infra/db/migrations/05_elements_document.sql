-- Éléments d'information typés par document (GED)
--
-- Pourquoi : `documents.extraction_data` est une map plate clé/valeur. Elle
-- ne dit pas ce qu'est une valeur — un mot-clé d'indexation est
-- indiscernable d'un montant, et la recherche plein texte ne peut ni
-- filtrer ni pondérer. Chaque information devient un element type, avec sa
-- provenance (ocr / ia / manuel) pour distinguer une proposition automatique
-- d'une correction humaine.
--
-- `zone` porte le rectangle (0-1) de la zone OCR d'origine : c'est ce qui
-- permet de rejouer l'OCR sur une seule partie du document au lieu de
-- retraiter le fichier entier.

CREATE TABLE IF NOT EXISTS document_elements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT NOT NULL,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  nature      TEXT NOT NULL DEFAULT 'autre',
  label       TEXT NOT NULL,
  valeur      TEXT NOT NULL,
  page        INTEGER,
  zone        JSONB,
  confiance   DOUBLE PRECISION,
  statut      TEXT NOT NULL DEFAULT 'a_valider',
  source      TEXT NOT NULL DEFAULT 'ia',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_elements_document
  ON document_elements (tenant_id, document_id);

-- Un mot-clé n'est pas un champ métier : il sert à indexer. Le nature
-- 'mot_cle' est donc celui qu'on requête pour la recherche.
CREATE INDEX IF NOT EXISTS idx_document_elements_nature
  ON document_elements (tenant_id, nature);

-- Deux people ne saisissent pas deux fois la même information sur le même
-- document : la contrainte rend le doublon impossible plutôt que de le
-- laisser s'accumuler.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_document_elements_valeur
  ON document_elements (document_id, nature, label, valeur);

-- La file de revue humaine : ce que l'IA n'a pas su valider seul.
CREATE INDEX IF NOT EXISTS idx_document_elements_a_valider
  ON document_elements (tenant_id, statut) WHERE statut = 'a_valider';

-- L'index plein texte de la migration 04 ne couvre que les chunks. Les
-- éléments saisis à la main doivent eux aussi être interrogeables.
CREATE INDEX IF NOT EXISTS idx_document_elements_recherche
  ON document_elements USING GIN (to_tsvector('simple', coalesce(label, '') || ' ' || coalesce(valeur, '')));
