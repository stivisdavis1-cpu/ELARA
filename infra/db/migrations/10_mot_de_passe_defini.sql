-- Mémorise le moment où le mot de passe d'un compte a été posé.
--
-- Une invitation ne doit pouvoir définir un mot de passe que sur une identité
-- qui n'en a jamais eu. Sans cette information, l'API ne peut pas le savoir :
-- Keycloak ne renvoie pas les identifiants d'un utilisateur, et l'API
-- d'administration ne permet pas de distinguer un compte actif d'une
-- invitation en attente. Conséquence réelle avant cette colonne : un
-- administrateur d'une organisation pouvait inviter l'adresse d'un compte déjà
-- actif — y compris celle d'un administrateur global ou d'un membre d'une autre
-- société — puis réécrire son mot de passe avec le lien reçu.
--
-- NULL signifie donc « aucun mot de passe n'a encore été posé par ELARA ».
-- Toutes les lignes existantes sont datées : elles correspondent à des comptes
-- déjà utilisables, donc à ne pas réinitialiser. Les identités présentes dans
-- Keycloak sans ligne ici restent, elles, invérifiables : l'invitation leur
-- est refusée.
ALTER TABLE users ADD COLUMN IF NOT EXISTS mot_de_passe_defini_le timestamptz;

UPDATE users SET mot_de_passe_defini_le = now() WHERE mot_de_passe_defini_le IS NULL AND keycloak_subject_id IS NOT NULL;

COMMENT ON COLUMN users.mot_de_passe_defini_le IS
  'Instant où le mot de passe a été posé. NULL = invitation jamais activée.';
