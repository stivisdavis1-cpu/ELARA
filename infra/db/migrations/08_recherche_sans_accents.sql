-- ============================================================================
-- 08 · Index plein texte insensible aux accents
-- ----------------------------------------------------------------------------
-- Constat mesuré sur les pièces réelles du tenant : la recherche lexicale ne
-- renvoyait aucune ligne, sur aucune question.
--
-- La colonne `tcv` est calculée avec la configuration 'simple', qui conserve
-- les accents. Or le texte des documents est accentué (« salariés »,
-- « déclaration ») alors que la requête arrive désaccentuée :
-- `SearchService.reformuler()` normalise en NFD puis retire les diacritiques
-- avant d'interroger la base. « salarie » ne matchait donc jamais « salarié ».
-- Chaque mot-clé d'indexation d'un document français était inatteignable.
--
-- On ne remplace pas 'simple' par 'french' : le dictionnaire français stemmed,
-- il agglutinerait des formes comptablement différentes, et il reste accentué.
-- On désaccentue à l'indexation, une fois pour toutes.
--
-- `websearch_to_tsquery` combine les termes en ET : c'est volontaire, ça
-- garde le classement précis. La requête arrive déjà débarrassée de ses mots-outils
-- (`reformuler()` retire « du », « de », « a »…), donc l'AND ne vide pas les
-- résultats par lui-même.
-- ============================================================================

-- La fonction est IMMUTABLE, donc utilisable dans une colonne générée, et ne
-- demande aucune extension. Les deux chaînes ont volontairement la même
-- longueur : `translate()` ignore silencieusement ce qui déborde, ce qui
-- laisserait des caractères non traduits sans la moindre erreur.
CREATE OR REPLACE FUNCTION elara_sans_accent(texte TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT translate(
    coalesce(texte, ''),
    'àâäáãåçéèêëíìîïñóòôöõøúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕØÚÙÛÜÝŸ',
    'aaaaaaceeeeiiiinoooooouuuuyyAAAAAACEEEEIIIINOOOOOOUUUUYY'
  )
$$;

DO $$
DECLARE
  v_src TEXT := 'àâäáãåçéèêëíìîïñóòôöõøúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕØÚÙÛÜÝŸ';
  v_dst TEXT := 'aaaaaaceeeeiiiinoooooouuuuyyAAAAAACEEEEIIIINOOOOOOUUUUYY';
BEGIN
  IF length(v_src) <> length(v_dst) THEN
    RAISE EXCEPTION 'Table de traduction des accents incohérente : % caractères source, % cible',
      length(v_src), length(v_dst);
  END IF;
END
$$;

-- Une colonne GENERATED ne peut pas changer d'expression : on la supprime
-- avant de la recréer. Le contenu est conservé, seule l'indexation change.
ALTER TABLE document_chunks DROP COLUMN IF EXISTS tcv;

ALTER TABLE document_chunks
  ADD COLUMN tcv tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', elara_sans_accent(content))) STORED;

CREATE INDEX IF NOT EXISTS document_chunks_tcv_idx
  ON document_chunks USING GIN (tcv);

-- Les éléments saisis à la main (migration 05) partagent le même défaut :
-- leur index plein texte est lui aussi construit sur du texte accentué.
DROP INDEX IF EXISTS idx_document_elements_recherche;

CREATE INDEX IF NOT EXISTS idx_document_elements_recherche
  ON document_elements USING GIN (
    to_tsvector('simple', elara_sans_accent(label || ' ' || valeur))
  );
