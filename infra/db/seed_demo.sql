-- =====================================================================================
-- JEU DE DEMONSTRATION — OPT-IN, JAMAIS EXECUTE AUTOMATIQUEMENT
-- =====================================================================================
-- Ce fichier cree une entreprise imaginaire avec des clients et des factures
-- fictifs. Il ne sert qu'a peupler un environnement de developpement local
-- pour juger l'interface sans importer de vrais documents.
--
-- Il ne doit JAMAIS etre execute sur :
--   - une base de production ;
--   - une base de recette partagee ;
--   - la base d'un client.
--
-- Ces lignes sont identifiables et supprimables :
--   * tenant   : raison_sociale = 'SARL AFRIK DISTRIBUTION'
--   * utilisateur : email = 'admin@afrik-distribution.cm'
-- Le script de nettoyage corresponding est infra/db/purge_demo.sql.
--
-- Usage :
--   psql "$DATABASE_URL" -f infra/db/seed_demo.sql
-- =====================================================================================

-- Tenant de démonstration
INSERT INTO "tenants" (id, raison_sociale, secteur, pays, ville, devise, statut_abonnement)
VALUES ('00000000-0000-0000-0000-000000000001', 'SARL AFRIK DISTRIBUTION', 'commerce/distribution', 'Cameroun', 'Douala', 'XAF', 'actif')
ON CONFLICT DO NOTHING;

-- Utilisateur admin du tenant de démonstration
INSERT INTO "users" (id, tenant_id, nom, email, role, keycloak_subject_id)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Admin Demo', 'admin@afrik-distribution.cm', 'admin_compte', 'auth_id_123')
ON CONFLICT DO NOTHING;

-- Liaison utilisateur / tenant
INSERT INTO "user_tenants" (user_id, tenant_id, role)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'admin_compte')
ON CONFLICT DO NOTHING;

-- Clients fictifs du tenant de démonstration
INSERT INTO "clients" (id, tenant_id, nom, email, telephone, adresse)
VALUES
('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Boutique Le Phare', 'contact@lephare.cm', '+237699999999', 'Akwa, Douala'),
('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Superette du Coin', 'superette@yahoo.fr', '+237677777777', 'Bastos, Yaoundé')
ON CONFLICT DO NOTHING;

-- Factures fictives du tenant de démonstration
INSERT INTO "factures" (id, tenant_id, client_id, numero, montant_total, statut, date_emission, date_echeance)
VALUES
('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'F-2026-001', 150000.00, 'payee', '2026-09-01 10:00:00', '2026-09-15 10:00:00'),
('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102', 'F-2026-002', 320000.00, 'impayee', '2026-08-15 10:00:00', '2026-08-30 10:00:00')
ON CONFLICT DO NOTHING;
