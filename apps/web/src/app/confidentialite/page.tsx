import type { Metadata } from "next";
import Link from "next/link";
import { siteUrl } from "@/lib/seo";
import "./confidentialite.css";

const SITE = siteUrl();

export const metadata: Metadata = {
  title: "Confidentialité, conditions & conformité",
  description:
    "Comment Elara collecte, utilise et protège vos données ; conditions d'utilisation du pré-lancement et conformité à la Loi n°2024/017.",
  alternates: { canonical: `${SITE}/confidentialite` },
  openGraph: {
    type: "article",
    url: `${SITE}/confidentialite`,
    siteName: "Elara",
    title: "Confidentialité, conditions & conformité — Elara",
    description: "Politique de confidentialité, conditions d'utilisation et conformité d'Elara.",
  },
};

export default function PageConfidentialite() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link href="/" className="legal-brand">Elara</Link>
        <Link href="/" className="legal-retour">← Retour au site</Link>
      </header>

      <article className="legal-body">
        <h1>Confidentialité, conditions & conformité</h1>
        <p className="legal-maj">Dernière mise à jour : 6 octobre 2026.</p>

        <p>
          Cette page décrit, sans jargon, ce qu&apos;Elara fait des données
          confiées pendant le pré-lancement : celles saisies dans le formulaire de
          la liste d&apos;attente, celles de la demande de démonstration, et ce
          que le site conserve dans votre navigateur.
        </p>

        <section id="donnees">
          <h2>1. Données collectées</h2>
          <p>
            <strong>Liste d&apos;attente</strong> : prénom, adresse e-mail, nom
            d&apos;entreprise (facultatif) et, si vous venez d&apos;un lien de
            parrainage, le code du parrain. Rien d&apos;autre.
          </p>
          <p>
            <strong>Demande de démonstration</strong> : prénom, nom, e-mail
            professionnel, téléphone, entreprise, formule visée et votre message.
          </p>
          <p>
            <strong>Navigation</strong> : aucune balise publicitaire, aucun
            traceur tiers. Votre adresse IP est utilisée temporairement par la
            limitation de débit pour empêcher l&apos;abus des formulaires, et des
            journaux techniques d&apos;erreur peuvent être conservés par le
            serveur.
          </p>
        </section>

        <section id="finalites">
          <h2>2. Finalités et base légale</h2>
          <p>
            Ces données servent uniquement à tenir la file d&apos;attente, à vous
            envoyer votre lien de parrainage, à vous contacter à l&apos;ouverture
            et à organiser les démonstrations demandées. Elles ne sont ni vendues,
            ni louées, ni utilisées à des fins publicitaires. Le traitement repose
            sur votre consentement, donné au moment de l&apos;envoi du formulaire.
          </p>
        </section>

        <section id="conservation">
          <h2>3. Conservation</h2>
          <p>
            Les inscriptions à la liste d&apos;attente sont conservées
            jusqu&apos;à l&apos;ouverture de l&apos;accès, puis archivées pour
            l&apos;attribution des places. Vous pouvez demander la suppression de
            vos données à tout moment : un simple e-mail suffit.
          </p>
        </section>

        <section id="navigateur">
          <h2>4. Ce que votre navigateur garde</h2>
          <p>
            Après inscription, votre code de parrainage et votre position sont
            enregistrés dans <code>localStorage</code> afin que le lien de
            partage ne soit pas perdu si vous changez d&apos;écran. Cette
            information n&apos;est ni transmise à un tiers, ni utilisée à
            d&apos;autres fins. La zone connectée de l&apos;application utilise un
            cookie de session strictement nécessaire.
          </p>
        </section>

        <section id="destinataires">
          <h2>5. Destinataires</h2>
          <p>
            L&apos;hébergement et la base de données sont gérés par
            l&apos;équipe Elara sur une infrastructure cloud managée, avec
            sauvegardes régulières. Seules les personnes chargées du suivi de la
            liste d&apos;attente et des démonstrations accèdent aux formulaires.
          </p>
        </section>

        <section id="droits">
          <h2>6. Vos droits</h2>
          <p>
            Vous disposez d&apos;un droit d&apos;accès, de rectification et de
            suppression de vos données, ainsi que d&apos;opposition au traitement.
            Pour l&apos;exercer :{" "}
            <a href="mailto:contact@elara.app">contact@elara.app</a>. La réponse
            intervient dans les meilleurs délais.
          </p>
        </section>

        <section id="conformite">
          <h2>7. Conformité — Loi n°2024/017</h2>
          <p>
            Elara est conçu pour être aligné sur la Loi n°2024/017 relative à la
            protection des données personnelles : minimisation de la collecte,
            finalités explicites, sécurité par conception (mots de passe jamais
            stockés en clair, jetons d&apos;activation conservés sous forme
            d&apos;empreinte) et traçabilité des accès à l&apos;intérieur de la
            plateforme.
          </p>
        </section>

        <section id="conditions">
          <h2>8. Conditions d&apos;utilisation (pré-lancement)</h2>
          <p>
            <strong>Liste d&apos;attente</strong> : gratuite, sans engagement,
            sans carte bancaire. Un e-mail = une inscription ; l&apos;usage de
            robots ou d&apos;adresses jetables entraîne la suppression de
            l&apos;inscription.
          </p>
          <p>
            <strong>Parrainage</strong> : les liens de partage sont ouverts à
            tous. Le classement est calculé par nos serveurs à partir des
            inscriptions réelles ; toute tentative de triche (adresses multiples,
            liens détournés) peut être retirée du classement.
          </p>
          <p>
            <strong>Démonstrations</strong> : gratuites et sans engagement ; la
            demande ne vaut ni devis, ni contrat. Les conditions définitives des
            comptes payants (abonnement, facturation, résiliation) seront
            communiquées avec l&apos;ouverture de l&apos;accès et devront être
            acceptées avant toute souscription.
          </p>
        </section>

        <section id="apropos">
          <h2>9. À propos</h2>
          <p>
            Elara est le cerveau numérique des PME et cabinets comptables
            d&apos;Afrique : scanner de documents, facturation, indicateurs
            financiers et assistant IA, conçus pour la réalité du commerce
            africain. Équipe basée à Douala, Cameroun.
          </p>
        </section>

        <section id="contact">
          <h2>10. Contact</h2>
          <p>
            <a href="mailto:contact@elara.app">contact@elara.app</a> ·
            www.elara.app · Douala, Cameroun
          </p>
        </section>
      </article>

      <footer className="legal-footer">© 2026 Elara. Tous droits réservés.</footer>
    </main>
  );
}