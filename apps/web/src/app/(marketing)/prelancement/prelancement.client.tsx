"use client";
import React, { useState, useEffect, useRef } from "react";
import "./prelancement.css";
import { inscrireListeAttente } from "@/lib/marketing-api";

export default function PrelancementPage() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [position, setPosition] = useState(0);
  const [finalPos, setFinalPos] = useState(0);
  const [referLink, setReferLink] = useState("elara.app/r/••••••");
  const [copyText, setCopyText] = useState("Copier");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [remarque, setRemarque] = useState("");
  const [parrain, setParrain] = useState("");
  
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Intersection Observer for scroll animations
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = document.querySelectorAll('.reveal-scroll');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observerRef.current?.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    
    items.forEach((el) => observerRef.current?.observe(el));
    
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  // Restauration : le code de parrainage et la position réelle survivent au
  // changement d'appareil via `localStorage`. Aucune position n'est fabriquée
  // ici — valeur écrite uniquement depuis la réponse du serveur. Lecture
  // défaérée d'un tour : aucun état posé dans le corps synchrone de l'effet.
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const brut = window.localStorage.getItem("elara_liste_attente");
        if (!brut) return;
        const enregistrement = JSON.parse(brut) as { code?: string; position?: number };
        if (enregistrement.code) {
          setReferLink(`${window.location.origin}/r/${enregistrement.code}`);
          setFormSubmitted(true);
          if (typeof enregistrement.position === "number") {
            setFinalPos(enregistrement.position);
            setPosition(enregistrement.position);
          }
        }
      } catch {
        // Stockage inaccessible (navigation privée) : le formulaire reste vide.
      }
    });
  }, []);

  // `?p=CODE` : lien partagé par un parrain, ouvert depuis WhatsApp ou e-mail.
  // Lecture défaérée d'un tour : aucun état n'est posé dans le corps synchrone
  // de l'effet (regle set-state-in-effect).
  useEffect(() => {
    queueMicrotask(() => {
      const code = new URLSearchParams(window.location.search).get("p");
      if (code && /^[A-Za-z0-9]{4,16}$/.test(code.trim())) {
        setParrain(code.trim().toUpperCase());
      }
    });
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const formulaire = e.currentTarget as HTMLFormElement;
    setErreur("");
    setRemarque("");
    setEnvoi(true);
    try {
      const resultat = await inscrireListeAttente({
        prenom: (formulaire.elements.namedItem("prenom") as HTMLInputElement)?.value ?? "",
        email: (formulaire.elements.namedItem("email") as HTMLInputElement)?.value ?? "",
        entreprise: (formulaire.elements.namedItem("entreprise") as HTMLInputElement)?.value || undefined,
        parrain: parrain || undefined,
        site_web: (formulaire.elements.namedItem("site_web") as HTMLInputElement)?.value ?? "",
      });

      setReferLink(`${window.location.origin}/r/${resultat.code_parrain}`);
      setFinalPos(resultat.position);
      setRemarque(
        resultat.deja_inscrit
          ? "Vous étiez déjà inscrit·e : voici votre position actuelle."
          : resultat.parrain_inconnu
            ? "Le code parrain transmis est inconnu : inscription enregistrée, sans parrain."
            : "",
      );
      try {
        window.localStorage.setItem(
          "elara_liste_attente",
          JSON.stringify({ code: resultat.code_parrain, position: resultat.position }),
        );
      } catch {
        // Stockage indisponible : le lien reste affiché à l'écran.
      }

      const reduire = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduire || resultat.position <= 1) {
        setPosition(resultat.position);
      } else {
        let depart: number | null = null;
        const pas = (ts: number) => {
          if (!depart) depart = ts;
          const progression = Math.min((ts - depart) / 700, 1);
          setPosition(Math.round(1 + progression * (resultat.position - 1)));
          if (progression < 1) requestAnimationFrame(pas);
        };
        requestAnimationFrame(pas);
      }
      setFormSubmitted(true);
    } catch (err) {
      setErreur(
        err instanceof Error ? err.message : "Inscription impossible : réessayez dans un instant.",
      );
    } finally {
      setEnvoi(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referLink).then(() => {
      setCopyText("Copié !");
      setTimeout(() => setCopyText("Copier"), 1600);
    }).catch(() => {});
  };

  const waText = encodeURIComponent(`Je viens de m'inscrire sur la liste d'attente d'Elara, l'Assistant Virtuel qui organise automatiquement les finances des PME. Rejoins-moi via mon lien : https://${referLink}`);
  const mailSubject = encodeURIComponent("Rejoins-moi sur la liste d'attente d'Elara");
  const mailBody = encodeURIComponent(`Salut,

Je viens de m'inscrire sur la liste d'attente d'Elara, l'outil qui transforme les documents et messages de mon entreprise en tableau de bord financier.

Inscris-toi via mon lien : https://${referLink}

À bientôt !`);

  return (
    <div className="prelancement-page">
      <header>
  <div className="wrap nav">
    <a className="brand" href="#" aria-label="Elara — accueil">
      <svg width="28" height="24" viewBox="0 0 30 26" fill="none" aria-hidden="true">
        <path d="M0 13 L6 13 L8.5 3 L12 23 L15.5 8 L18.5 18 L21 13 L30 13" stroke="url(#preNavLogoGrad)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        <defs><linearGradient id="preNavLogoGrad" x1="0" y1="0" x2="30" y2="0"><stop stopColor="#A9761F"/><stop offset="1" stopColor="#1A4A3C"/></linearGradient></defs>
      </svg>
      Elara
    </a>
    <span className="nav-tag"><span className="dot"></span>Ouverture progressive <span className="hide-mobile">— Cameroun</span></span>
  </div>
</header>

<div className="hero-banner">
  <div className="no-image-anim" aria-hidden="true"></div>
  <img src="https://images.pexels.com/photos/3874040/pexels-photo-3874040.jpeg?auto=compress&cs=tinysrgb&w=1400" alt="Entrepreneur au travail" />
  <div className="hero-banner-copy">
    <span className="eyebrow reveal-up" style={{animationDelay: ".02s"}}>Avant le lancement</span>
    <h1 className="reveal-up" style={{animationDelay: ".12s"}}>Soyez parmi les <span className="mkt-highlight">premiers entrepreneurs</span> à essayer Elara.</h1>
  </div>
</div>

<section className="signup-section">
  <div className="wrap signup-grid">
    <div>
      <p className="hero-sub">Elara ouvre l&apos;accès progressivement, par vagues. Inscrivez-vous à la liste d&apos;attente et faites avancer votre place en invitant d&apos;autres entrepreneurs — avec des mois offerts à la clé.</p>

      <form className="signup-form reveal-scroll" id="signupForm" style={{ display: formSubmitted ? 'none' : 'flex' }} onSubmit={handleSignup}>
        <div className="signup-row">
          <input type="text" id="pname" name="prenom" placeholder="Prénom" required />
          <input type="email" id="pemail" name="email" placeholder="Email" required />
        </div>
        <input type="text" id="pcompany" name="entreprise" placeholder="Nom de votre entreprise (optionnel)" />
        {/* Pot de miel : invisible pour un humain, rempli par les robots. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}>
          <label htmlFor="pwebsite">Site web</label>
          <input type="text" id="pwebsite" name="site_web" tabIndex={-1} autoComplete="off" />
        </div>
        {remarque && <p className="signup-note" role="status">{remarque}</p>}
        <button type="submit" className="signup-btn" disabled={envoi}>
          {envoi ? "Inscription en cours…" : "Rejoindre la liste d'attente"}
        </button>
        {erreur && (
          <p className="signup-note" role="alert" style={{ color: "#c0392b" }}>{erreur}</p>
        )}
        <p className="signup-note">Aucune carte bancaire requise. Vous recevrez un email dès l&apos;ouverture de votre créneau.</p>
      </form>

      <div className={`success-panel ${formSubmitted ? 'show' : ''}`} id="successPanel">
        <div className="position-card">
          <div className="position-label">Votre position dans la file</div>
          <div className="position-num" id="positionNum">#{position === 0 ? '—' : position}</div>
          <div className="position-hint">Position réelle dans la file, recalculée à chaque nouvelle inscription.</div>
        </div>
        <div className="refer-box">
          <h3>Avancez dans la file</h3>
          <p>Partagez votre lien personnel — chaque entrepreneur inscrit grâce à vous vous rapproche de l&apos;accès anticipé et des récompenses ci-contre.</p>
          <div className="refer-link-row">
            <input type="text" id="referLink" readOnly value={referLink} />
            <button className="copy-btn" id="copyBtn" type="button" onClick={copyToClipboard}>{copyText}</button>
          </div>
          <div className="share-row">
            <a className="share-btn" id="waShare" href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer">Partager sur WhatsApp</a>
            <a className="share-btn" id="mailShare" href={`mailto:?subject=${mailSubject}&body=${mailBody}`}>Partager par email</a>
          </div>
        </div>
      </div>
    </div>

    <div className={`ladder-panel reveal-scroll ${formSubmitted ? 'is-visible' : ''}`}>
      <h2>Parrainez, <span className="mkt-highlight">avancez</span>, gagnez</h2>
      <p className="sub">Vos récompenses se cumulent au fil de vos invitations.</p>

      <div className="rung">
        <div className="rung-num">1</div>
        <div>
          <div className="rung-title">1 invitation acceptée</div>
          <div className="rung-desc">Vous passez devant la moitié de la file d&apos;attente restante.</div>
        </div>
      </div>
      <div className="rung">
        <div className="rung-num">3</div>
        <div>
          <div className="rung-title">3 invitations acceptées</div>
          <div className="rung-desc">1 mois du palier Starter offert dès l&apos;ouverture de votre accès.</div>
        </div>
      </div>
      <div className="rung">
        <div className="rung-num">5</div>
        <div>
          <div className="rung-title">5 invitations acceptées</div>
          <div className="rung-desc">3 mois du palier Pro offerts, badge « Fondateur Elara » sur votre profil.</div>
        </div>
      </div>
      <div className="rung top">
        <div className="rung-num">10</div>
        <div>
          <div className="rung-title">10 invitations acceptées</div>
          <div className="rung-desc">1 an du palier Pro offert et tarif préférentiel à vie, garanti même après augmentation des prix.</div>
        </div>
      </div>
    </div>
  </div>
</section>

<section className="plans-section">
  <div className="wrap">
    <div className="section-head reveal-scroll" style={{textAlign: "center", marginInline: "auto"}}>
      <span className="section-label">Les Paliers à l&apos;Ouverture</span>
      <h2 style={{fontSize: "clamp(20px, 2.4vw, 32px)"}}>Découvrez les formules disponibles au <span className="mkt-highlight">lancement</span></h2>
      <p style={{marginInline: "auto"}}>Chaque palier supérieur conserve l&apos;ensemble des fonctionnalités du précédent et renforce l&apos;accompagnement direct de votre entreprise.</p>
    </div>

    <div className="pricing-grid reveal-scroll">
      <div className="pricing-card">
        <div className="pricing-name">Freemium</div>
        <div style={{fontSize: "11.5px", color: "var(--text-dim)"}}>Pour tester le système</div>
        <div className="pricing-price">0 F <span>/mois</span></div>
        <div className="pricing-inheritance">Socle de base</div>
        <ul className="pricing-features">
          <li>Business Scanner (20 documents/mois)</li>
          <li>Rapport mensuel ponctuel</li>
          <li>Assistant restreint</li>
        </ul>
        <div className="pricing-contract">
          <strong>À l&apos;ouverture :</strong> Accès immédiat et support numérique.
        </div>
        <button className="pricing-btn" onClick={() => { document.getElementById('signupForm')?.scrollIntoView({behavior:'smooth'}) }}>Rejoindre la file</button>
      </div>

      <div className="pricing-card featured">
        <span className="pricing-badge">Recommandé</span>
        <div className="pricing-name">Starter</div>
        <div style={{fontSize: "11.5px", color: "var(--text-dim)"}}>Accessible dès 3 parrainages</div>
        <div className="pricing-price">9 900 F <span>/mois</span></div>
        <div className="pricing-inheritance">Tout ce qui est dans Freemium, plus :</div>
        <ul className="pricing-features">
          <li>Business Scanner illimité</li>
          <li>Mémoire d&apos;Entreprise complète</li>
          <li>Directeur Financier Virtuel de base &amp; radar TVA</li>
          <li>3 utilisateurs inclus</li>
        </ul>
        <div className="pricing-contract">
          <strong>À l&apos;ouverture :</strong> Session de cadrage (30 min) et support email garanti.
        </div>
        <button className="pricing-btn" onClick={() => { document.getElementById('signupForm')?.scrollIntoView({behavior:'smooth'}) }}>Gagner ce palier</button>
      </div>

      <div className="pricing-card">
        <div className="pricing-name">Pro</div>
        <div style={{fontSize: "11.5px", color: "var(--text-dim)"}}>Accessible dès 5 parrainages</div>
        <div className="pricing-price">24 900 F <span>/mois</span></div>
        <div className="pricing-inheritance">Tout ce qui est dans Starter, plus :</div>
        <ul className="pricing-features">
          <li>Module Assistant Commercial</li>
          <li>Importation WhatsApp Business</li>
          <li>Automatisations assistées</li>
          <li>Rapprochement bancaire &amp; MoMo</li>
        </ul>
        <div className="pricing-contract">
          <strong>À l&apos;ouverture :</strong> Onboarding complet de l&apos;équipe (1h) et support WhatsApp direct.
        </div>
        <button className="pricing-btn" onClick={() => { document.getElementById('signupForm')?.scrollIntoView({behavior:'smooth'}) }}>Gagner ce palier</button>
      </div>

      <div className="pricing-card">
        <div className="pricing-name">Business</div>
        <div style={{fontSize: "11.5px", color: "var(--text-dim)"}}>Structures en expansion</div>
        <div className="pricing-price">54 900 F <span>/mois</span></div>
        <div className="pricing-inheritance">Tout ce qui est dans Pro, plus :</div>
        <ul className="pricing-features">
          <li>Module Opérations &amp; Assistant Opérationnel</li>
          <li>Intégrations API &amp; export ERP</li>
          <li>Comptes multi-utilisateurs avancés</li>
        </ul>
        <div className="pricing-contract">
          <strong>À l&apos;ouverture :</strong> Convention Loi n°2024/017 signée et Account Manager dédié par téléphone.
        </div>
        <button className="pricing-btn" onClick={() => { document.getElementById('signupForm')?.scrollIntoView({behavior:'smooth'}) }}>S&apos;inscrire</button>
      </div>
    </div>
  </div>
</section>

<section className="why">
  <div className="wrap">
    <div className="why-strip">
      <div className="no-image-anim" aria-hidden="true"></div>
      <img src="https://images.pexels.com/photos/20209020/pexels-photo-20209020.jpeg?auto=compress&cs=tinysrgb&w=1400" alt="Entrepreneure" />
      <div className="why-strip-copy">Conçu pour la réalité du commerce africain — pas importé d&apos;ailleurs.</div>
    </div>
    <div className="why-grid reveal-scroll">
      <div className="why-card">
        <div className="why-num">Pourquoi maintenant</div>
        <h3>Un accès accompagné, pas un simple compte</h3>
        <p>Les premières entreprises inscrites bénéficient d&apos;un onboarding personnalisé pour connecter leurs premiers documents et obtenir leur premier Business Health Score en quelques jours.</p>
      </div>
      <div className="why-card">
        <div className="why-num">Ce qui vous attend</div>
        <h3>Business Scanner, Directeur Financier Virtuel et Rapport Automatisé dès le jour 1</h3>
        <p>Dès l&apos;ouverture de votre créneau, vous accédez aux modules du MVP : extraction de documents, mémoire d&apos;entreprise, indicateurs financiers et Assistant Virtuel.</p>
      </div>
      <div className="why-card">
        <div className="why-num">Sans risque</div>
        <h3>Aucun engagement avant l&apos;ouverture</h3>
        <p>L&apos;inscription à la liste d&apos;attente est gratuite et sans engagement. Vous choisissez votre palier au moment où votre accès s&apos;ouvre.</p>
      </div>
    </div>
  </div>
</section>

<footer>
  <div className="wrap foot-row">
    <div className="foot-brand">
      <svg width="24" height="21" viewBox="0 0 30 26" fill="none" aria-hidden="true">
        <path d="M0 13 L6 13 L8.5 3 L12 23 L15.5 8 L18.5 18 L21 13 L30 13" stroke="url(#preFootLogoGrad)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        <defs><linearGradient id="preFootLogoGrad" x1="0" y1="0" x2="30" y2="0"><stop stopColor="#D9A64A"/><stop offset="1" stopColor="#6FA890"/></linearGradient></defs>
      </svg>
      Elara
    </div>
    <div className="foot-meta">
      <a href="/confidentialite" style={{ color: "inherit", textDecoration: "underline" }}>Confidentialité</a>
      {" · contact@elara.app · www.elara.app · Douala, Cameroun"}
    </div>
  </div>
</footer>
    </div>
  );
}

