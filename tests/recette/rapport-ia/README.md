# Recette — Rapport IA

## Critère officiel
> Rapport généré automatiquement à la fréquence paramétrée, reflétant les données
> réellement présentes à la date de génération.

## Procédure
1. Configurer une fréquence de rapport (cron via RabbitMQ/`rapport.service`,
   ex. chaîne `0 6 * * 1` = lundi 06:00).
2. Inspecter la file d'exécution ; vérifier que le **run planifié** déclenche bien un
   génération (job `rapport`).
3. Comparer le contenu du rapport généré (`/v1/rapport/<id>`) aux données présentes
   en base **à la date de génération** : pas de donnée postérieure à l'horodatage,
   période couverte correcte.

## Résultat attendu
- Fréquence : aucun run manqué / aucun run en double sur la fenêtre observée.
- Fraîcheur : les transactions enregistrées après `date_generation` **n'apparaissent pas** ;
  celles présentes avant y figurent toutes.

## Statut recette
| Vérification | Méthode | Statut |
|---|---|---|
| Déclenchement à la fréquence paramétrée | job RabbitMQ + logs | [DEMO] |
| Fraîcheur des données à date | comparaison contenu vs `date_generation` | [DEMO] |