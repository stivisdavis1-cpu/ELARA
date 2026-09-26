-- ============================================================================
-- 04 · Recherche documentaire et boucle d'évaluation de l'IA
-- ----------------------------------------------------------------------------
-- La recherche de l'assistant était purement vectorielle, et son embedding
-- tombait sur des vecteurs aléatoires quand l'API IA était indisponible : les
-- résultats étaient alors du bruit, sans aucun signal pour l'utilisateur.
--
-- On ajoute :
--   1. une colonne tsvector + index GIN sur document_chunks (recherche BM25)
--   2. le titre du document porté sur chaque chunk, pour mieux le nommer
--   3. une table de feedback pour mesurer la qualité des réponses dans le temps
--
-- La configuration 'simple' est volontaire : elle ne stemmed pas, ce qui
-- évite d'agglutiner des formes françaisesmorphologiquement proches mais
-- comptablement différentes («Livret» / «livrets »). Le BM25 reste utile, et
-- la recherche vectorielle couvre les variantes.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Colonne tsvector + index GIN
-- ---------------------------------------------------------------------------
ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS tcv tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content, ''))) STORED;

CREATE INDEX IF NOT EXISTS document_chunks_tcv_idx
  ON document_chunks USING GIN (tcv);

-- ---------------------------------------------------------------------------
-- 2. Titre du document recopié sur le chunk
-- ---------------------------------------------------------------------------
-- Permet de citer « Facture client — page 3 » plutôt que l'identifiant du
-- document, et d'identifier un passage sans jointure.
ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS titre_document TEXT;

UPDATE document_chunks c
   SET titre_document = coalesce(d.type_document, split_part(d.lien_minio, '/', 3))
  FROM documents d
 WHERE d.id = c.document_id
   AND c.titre_document IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Feedback sur les réponses de l'assistant
-- ---------------------------------------------------------------------------
-- Sans signal utilisateur, aucune amélioration de la récupération n'est
-- mesurable : c'est la seule métrique qui dise si l'IA a utile ou non.
CREATE TABLE IF NOT EXISTS assistant_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  message_id    TEXT,
  question      TEXT,
  note          SMALLINT NOT NULL CHECK (note IN (-1, 1)),
  commentaire   TEXT,
  -- Réponse donnée au moment du clic : sert à rejouer le cas plus tard.
  reponse       JSONB,
  motifs        TEXT[],
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT assistant_feedback_tenant_fkey
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS assistant_feedback_tenant_idx
  ON assistant_feedback (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS assistant_feedback_negatif_idx
  ON assistant_feedback (tenant_id, created_at DESC)
  WHERE note = -1;

-- ---------------------------------------------------------------------------
-- 4. Vue de pilotage : taux de satisfaction et questions qui échouent
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW assistant_qualite AS
SELECT
  f.tenant_id,
  count(*)                                        AS retours,
  count(*) FILTER (WHERE f.note = 1)               AS positifs,
  count(*) FILTER (WHERE f.note = -1)              AS negatifs,
  round(
    100.0 * count(*) FILTER (WHERE f.note = 1) / nullif(count(*), 0), 1
  )                                                AS taux_satisfaction,
  max(f.created_at)                                AS dernier_retour
FROM assistant_feedback f
GROUP BY f.tenant_id;
