-- Insertion d'un tenant de démonstration
INSERT INTO "tenants" (id, raison_sociale, secteur, pays, ville, devise, statut_abonnement)
VALUES ('00000000-0000-0000-0000-000000000001', 'SARL AFRIK DISTRIBUTION', 'commerce/distribution', 'Cameroun', 'Douala', 'XAF', 'actif')
ON CONFLICT DO NOTHING;

-- Insertion d'un utilisateur admin
INSERT INTO "users" (id, tenant_id, nom, email, role, keycloak_subject_id)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Admin Demo', 'admin@afrik-distribution.cm', 'admin_compte', 'auth_id_123')
ON CONFLICT DO NOTHING;

-- Lier l'utilisateur au tenant
INSERT INTO "user_tenants" (user_id, tenant_id, role)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'admin_compte')
ON CONFLICT DO NOTHING;

-- Insertion de clients de démonstration
INSERT INTO "clients" (id, tenant_id, nom, email, telephone, adresse)
VALUES 
('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Boutique Le Phare', 'contact@lephare.cm', '+237699999999', 'Akwa, Douala'),
('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Superette du Coin', 'superette@yahoo.fr', '+237677777777', 'Bastos, Yaoundé')
ON CONFLICT DO NOTHING;

-- Insertion de factures
INSERT INTO "factures" (id, tenant_id, client_id, numero, montant_total, statut, date_emission, date_echeance)
VALUES
('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'F-2026-001', 150000.00, 'payee', '2026-09-01 10:00:00', '2026-09-15 10:00:00'),
('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102', 'F-2026-002', 320000.00, 'impayee', '2026-08-15 10:00:00', '2026-08-30 10:00:00')
ON CONFLICT DO NOTHING;
