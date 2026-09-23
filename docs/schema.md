# Modèle de données ELARA (Business Memory)

Ce document décrit le schéma relationnel et la sécurité d'accès de la base de données ELARA.

## Sécurité des Données
1. **Multi-tenant** : Toute entité est liée à un `tenant_id`.
2. **Row Level Security (RLS)** : Les requêtes ne renvoient QUE les données du locataire courant via le contexte `app.current_tenant_id`.
3. **Traçabilité** : Triggers de modification automatiques et `audit_trail` pour le suivi des actions.

## Diagramme Entité-Relation (ERD)

```mermaid
erDiagram
    TENANTS ||--o{ USERS : "has"
    TENANTS ||--o{ CLIENTS : "has"
    TENANTS ||--o{ FOURNISSEURS : "has"
    TENANTS ||--o{ FACTURES : "has"
    TENANTS ||--o{ DOCUMENTS : "has"
    
    USERS ||--o{ USER_TENANTS : "assigned"
    
    CLIENTS ||--o{ FACTURES : "billed"
    FOURNISSEURS ||--o{ FACTURES : "issues"

    TENANTS {
        string id PK
        string raison_sociale
        string secteur
        string pays
        string ville
        string devise
        string statut_abonnement
        jsonb parametres
        datetime created_at
    }

    USERS {
        string id PK
        string tenant_id FK
        string nom
        string email
        string role
        string keycloak_subject_id
    }

    CLIENTS {
        string id PK
        string tenant_id FK
        string nom
        string email
        string telephone
    }

    FOURNISSEURS {
        string id PK
        string tenant_id FK
        string nom
        string email
        string telephone
    }

    FACTURES {
        string id PK
        string tenant_id FK
        string client_id FK
        string fournisseur_id FK
        string numero
        decimal montant_total
        string statut
        datetime date_emission
        datetime date_echeance
    }

    DOCUMENTS {
        string id PK
        string tenant_id FK
        string lien_minio
        string type_document
        float score_confiance
        string statut_validation
        string hash_document
    }
```
