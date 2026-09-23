"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, Variants } from "framer-motion";
import "./landing.css";

const heroContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", damping: 20 } }
};

const problemContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const problemItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200 } }
};

const visualItem: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 100, damping: 20 } }
};

export default function LancementPage() {

  const [isScrolled, setIsScrolled] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Scroll header
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Intersection Observer
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = document.querySelectorAll('.reveal-scroll');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
    } else {
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observerRef.current?.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
      items.forEach((el) => observerRef.current?.observe(el));
    }

    // Score animation
    const target = 78;
    if (reduceMotion) {
      setScore(target);
    } else {
      let start: number | null = null;
      const duration = 900;
      const step = (ts: number) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        setScore(Math.round(progress * target));
        if (progress < 1) requestAnimationFrame(step);
      };
      setTimeout(() => { requestAnimationFrame(step); }, 500);
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <div className="landing-page">
      <header className={isScrolled ? "is-scrolled" : ""}>
  <div className="nav wrap">
    <a className="brand" href="#top" aria-label="Elara — accueil">
      <svg width="28" height="24" viewBox="0 0 30 26" fill="none" aria-hidden="true">
        <path d="M0 13 L6 13 L8.5 3 L12 23 L15.5 8 L18.5 18 L21 13 L30 13" stroke="url(#navLogoGrad)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        <defs><linearGradient id="navLogoGrad" x1="0" y1="0" x2="30" y2="0"><stop stopColor="#A9761F"/><stop offset="1" stopColor="#1A4A3C"/></linearGradient></defs>
      </svg>
      Elara
    </a>
    <nav className="nav-links" aria-label="Navigation principale">
      <a href="#produit">Produit</a>
      <a href="#tarifs">Paliers &amp; Abonnements</a>
      <a href="#confiance">Confiance</a>
      <a href="#demo">Démo</a>
    </nav>
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
      <a href="/login" className="login-link" style={{ color: 'var(--text-dim)', fontSize: '14px', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--teal)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-dim)'}>Se connecter</a>
      <button className="nav-cta" onClick={() => { document.getElementById('demo')?.scrollIntoView({behavior:'smooth'}) }}>Demander une démo</button>
    </div>
  </div>
</header>

<section className="hero" id="top">
  <div className="hero-glow" aria-hidden="true"></div>
  <motion.div 
    className="wrap hero-grid"
    initial="hidden" 
    animate="show" 
    variants={heroContainer}
  >
    <div>
      <motion.span className="eyebrow" variants={heroItem}>Pour les PME, entrepreneurs et cabinets comptables</motion.span>
      <motion.h1 className="hero-title" variants={heroItem}>Vos données éparpillées, transformées en <span className="mkt-highlight">décisions claires.</span></motion.h1>
      <motion.p className="hero-sub" variants={heroItem}>Elara lit vos factures, vos photos WhatsApp, vos fichiers Excel et vos relevés Mobile Money — puis vous rend une vision financière et commerciale que vous n'aviez jamais eue. Sans changer vos habitudes.</motion.p>
      <motion.div className="hero-actions" variants={heroItem}>
        <button className="btn-primary" onClick={() => { document.getElementById('demo')?.scrollIntoView({behavior:'smooth'}) }}>Demander une démo</button>
        <button className="btn-secondary" onClick={() => { document.getElementById('tarifs')?.scrollIntoView({behavior:'smooth'}) }}>Voir les tarifs</button>
      </motion.div>
      <motion.p className="hero-trust" variants={heroItem}>Conçu pour le Cameroun · <strong>Human-in-the-loop</strong> sur chaque action sensible · Données chiffrées et isolées par entreprise</motion.p>
    </div>
    <motion.div 
      className="hero-visual" 
      variants={visualItem}
      animate={{ y: [0, -10, 0] }}
      transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
    >
      <div className="hero-photo-frame">
        <div className="no-image-anim" aria-hidden="true"></div>
        <img className="hero-photo" src="https://images.pexels.com/photos/5668845/pexels-photo-5668845.jpeg?auto=compress&cs=tinysrgb&w=900" alt="Entrepreneure pilotant les finances de son entreprise depuis son ordinateur portable" />
      </div>
      <div className="hero-float">
        <div className="ai-badge"><span className="dot"></span>Business Health Score</div>
        <div className="score"><span id="scoreCount">{score}</span><span style={{fontSize: "15px", color: "var(--text-dim)", fontWeight: "600"}}>/100</span></div>
        <div className="score-label">Trésorerie stable · 3 relances en attente</div>
        <div className="bar"><div id="scoreBar" style={{width: `${score}%`}}></div></div>
      </div>
    </motion.div>
  </motion.div>
</section>

<section id="probleme">
  <div className="wrap">
    <motion.div 
      className="section-head"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <span className="section-label">Le constat</span>
      <h2>Vous ne manquez pas de données. Elles sont juste <span className="mkt-highlight">dispersées.</span></h2>
      <p>Chaque canal garde sa propre version partielle de votre activité — aucun ne vous donne la vue d'ensemble.</p>
    </motion.div>
    <motion.div 
      className="problem-list"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-100px" }}
      variants={problemContainer}
    >
      <motion.div className="problem-card" variants={problemItem}>
        <h3>Trésorerie floue</h3>
        <p>Impossible de savoir en un coup d'œil ce qui rentre, ce qui sort et ce qui reste dû.</p>
      </motion.div>
      <motion.div className="problem-card" variants={problemItem}>
        <h3>Relances oubliées</h3>
        <p>Le suivi des clients et des factures impayées repose sur la mémoire, pas sur un système.</p>
      </motion.div>
      <motion.div className="problem-card" variants={problemItem}>
        <h3>Rapports manuels</h3>
        <p>Chaque bilan demande des heures de recherche entre cahiers, Excel et photos de reçus.</p>
      </motion.div>
      <motion.div className="problem-card" variants={problemItem}>
        <h3>Décisions à l'instinct</h3>
        <p>Sans vision consolidée, les choix se prennent sur l'intuition plutôt que sur les chiffres.</p>
      </motion.div>
    </motion.div>
  </div>
</section>

<section id="produit">
  <div className="wrap">
    <div className="section-head reveal-scroll">
      <span className="section-label">La solution</span>
      <h2>Un <span className="mkt-highlight">cerveau numérique</span> qui comprend votre entreprise</h2>
      <p>Elara transforme ce que vous avez déjà — photos, fichiers, messages — en une mémoire structurée, puis en intelligence exploitable.</p>
    </div>

    <div className="flow-diagram reveal-scroll" role="img" aria-label="Schéma : les photos, fichiers Excel, messages et relevés Mobile Money convergent vers la mémoire d'entreprise Elara, sont analysés par la couche d'intelligence, puis se transforment en rapport, relance ou facture.">
      <div className="flow-stage flow-sources">
        <div className="flow-chip"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7l1.5-3h5L16 7"/><circle cx="12" cy="13.5" r="3.2"/></svg>Photos</div>
        <div className="flow-chip"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M9 9v12"/></svg>Excel</div>
        <div className="flow-chip"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5h16v11H9l-4 4V5z"/></svg>Messages</div>
        <div className="flow-chip"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16" cy="14.5" r="1.4" fill="currentColor" stroke="none"/></svg>Mobile Money</div>
      </div>

      <div className="flow-connector"><span className="packet" style={{animationDelay: "0s"}}></span><span className="packet" style={{animationDelay: ".95s"}}></span><span className="packet" style={{animationDelay: "1.9s"}}></span></div>

      <div className="flow-stage flow-hub">
        <span className="flow-hub-ring"></span><span className="flow-hub-ring d2"></span>
        <div className="flow-hub-core">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/></svg>
          <span>Mémoire<br />d'entreprise</span>
        </div>
      </div>

      <div className="flow-connector"><span className="packet" style={{animationDelay: ".4s"}}></span><span className="packet" style={{animationDelay: "1.35s"}}></span></div>

      <div className="flow-stage flow-intel">
        <div className="flow-intel-card">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" strokeLinejoin="round"/></svg>
          <span>Intelligence</span>
          <div className="mini-bars"><span></span><span></span><span></span><span></span></div>
        </div>
      </div>

      <div className="flow-connector"><span className="packet" style={{animationDelay: ".7s"}}></span><span className="packet" style={{animationDelay: "1.65s"}}></span></div>

      <div className="flow-stage flow-actions">
        <div className="flow-chip hi"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/><path d="M9 13h6M9 17h6"/></svg>Rapport</div>
        <div className="flow-chip hi"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zM18 16v-5c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>Relance</div>
        <div className="flow-chip hi"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 2h10l2 2v18l-3-2-2 2-2-2-2 2-2-2-3 2V4z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>Facture</div>
      </div>
    </div>

    <div className="concept-grid reveal-scroll">
      <div>
        <h3>Business Memory</h3>
        <p>Une représentation structurée et persistante de votre entreprise : clients, fournisseurs, produits, transactions, documents.</p>
      </div>
      <div>
        <h3>Intelligence Layer</h3>
        <p>Cette mémoire est analysée pour produire indicateurs, scores, anomalies et recommandations concrètes.</p>
      </div>
      <div>
        <h3>Action Layer</h3>
        <p>Chaque recommandation peut devenir une action réelle — toujours avec votre validation avant exécution.</p>
      </div>
    </div>
  </div>
</section>

<section>
  <div className="wrap">
    <div className="section-head reveal-scroll">
      <span className="section-label">Le produit aujourd'hui</span>
      <h2>Cinq modules, une seule <span className="mkt-highlight">mémoire d'entreprise</span></h2>
    </div>
    <div className="module-grid reveal-scroll">
      <div className="module-card">
        <span className="module-num">01</span>
        <h3>Business Scanner</h3>
        <p>OCR et extraction automatique de vos factures, reçus et fichiers Excel.</p>
      </div>
      <div className="module-card hi">
        <span className="module-num">02</span>
        <h3>Mémoire Entreprise</h3>
        <p>La base centrale : clients, fournisseurs, produits, transactions, paiements.</p>
      </div>
      <div className="module-card">
        <span className="module-num">03</span>
        <h3>Directeur Financier Virtuel</h3>
        <p>Chiffre d'affaires, marge, trésorerie, créances, recommandations financières.</p>
      </div>
      <div className="module-card">
        <span className="module-num">04</span>
        <h3>Rapport Automatisé</h3>
        <p>Un Business Health Score automatique de votre santé financière et commerciale.</p>
      </div>
      <div className="module-card">
        <span className="module-num">05</span>
        <h3>Assistant Virtuel</h3>
        <p>Répond exclusivement à partir de vos données réelles — jamais d'information inventée.</p>
      </div>
    </div>
  </div>
</section>

{/*  ================= SECTION TARIFS & ENGAGEMENTS D'ACHAT =================  */}
<section id="tarifs" className="plans-section" style={{background: "var(--paper-2)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "clamp(48px, 7vh, 88px) 0"}}>
  <div className="wrap">
    <div className="section-head reveal-scroll" style={{textAlign: "center", marginInline: "auto"}}>
      <span className="section-label">Abonnements &amp; Engagements</span>
      <h2>Des formules évolutives avec <span className="mkt-highlight">garanties à la souscription</span></h2>
      <p style={{marginInline: "auto"}}>Chaque formule supérieure intègre l'ensemble des acquis précédents et déploie un accompagnement contractuel dédié.</p>
    </div>

    <div className="pricing-grid reveal-scroll">
      {/*  Freemium  */}
      <div className="pricing-card">
        <div className="pricing-name">Freemium</div>
        <div style={{fontSize: "11.5px", color: "var(--text-dim)"}}>Pour découvrir le potentiel</div>
        <div className="pricing-price">0 F <span>/mois</span></div>
        <div className="pricing-inheritance">Socle initial de découverte</div>
        <ul className="pricing-features">
          <li>Business Scanner (20 documents/mois)</li>
          <li>Rapport mensuel synthétique ponctuel</li>
          <li>Assistant Virtuel conversationnel restreint</li>
          <li>1 compte utilisateur actif</li>
        </ul>
        <div className="pricing-contract">
          <strong>À la souscription :</strong> Accès immédiat en libre-service, guide de prise en main numérique et support communautaire.
        </div>
        <button className="pricing-btn" onClick={() => { document.getElementById('demo')?.scrollIntoView({behavior:'smooth'}) }}>Commencer gratuit</button>
      </div>

      {/*  Starter  */}
      <div className="pricing-card featured">
        <span className="pricing-badge">Populaire</span>
        <div className="pricing-name">Starter</div>
        <div style={{fontSize: "11.5px", color: "var(--text-dim)"}}>PME en phase de structuration</div>
        <div className="pricing-price">9 900 F <span>/mois</span></div>
        <div className="pricing-inheritance">Tout ce qui est dans Freemium, plus :</div>
        <ul className="pricing-features">
          <li>Business Scanner illimité (PDF, JPG, Excel)</li>
          <li>Mémoire d'Entreprise persistante (Tiers, Soldes)</li>
          <li>Directeur Financier Virtuel de base &amp; radar fiscal TVA</li>
          <li>Jusqu'à 3 utilisateurs en simultané</li>
        </ul>
        <div className="pricing-contract">
          <strong>Contrat &amp; délivrables à l'achat :</strong> Appel de cadrage (30 min) avec un expert pour calibrer vos formats de factures, convention de confidentialité bilatérale et support par email sous 48h ouvrées.
        </div>
        <button className="pricing-btn" onClick={() => { document.getElementById('demo')?.scrollIntoView({behavior:'smooth'}) }}>Choisir Starter</button>
      </div>

      {/*  Pro  */}
      <div className="pricing-card">
        <div className="pricing-name">Pro</div>
        <div style={{fontSize: "11.5px", color: "var(--text-dim)"}}>Cadence commerciale active</div>
        <div className="pricing-price">24 900 F <span>/mois</span></div>
        <div className="pricing-inheritance">Tout ce qui est dans Starter, plus :</div>
        <ul className="pricing-features">
          <li>Module Assistant Commercial &amp; pipeline de ventes</li>
          <li>Importation directe via WhatsApp Business</li>
          <li>Relances impayés assistées &amp; modèles Word</li>
          <li>Rapprochement bancaire &amp; Mobile Money</li>
        </ul>
        <div className="pricing-contract">
          <strong>Contrat &amp; délivrables à l'achat :</strong> Onboarding personnalisé de vos équipes (session visio 1h), paramétrage du webhook WhatsApp, accord de niveau de service (SLA) garanti et ligne directe WhatsApp support.
        </div>
        <button className="pricing-btn" onClick={() => { document.getElementById('demo')?.scrollIntoView({behavior:'smooth'}) }}>Choisir Pro</button>
      </div>

      {/*  Business  */}
      <div className="pricing-card">
        <div className="pricing-name">Business</div>
        <div style={{fontSize: "11.5px", color: "var(--text-dim)"}}>Groupes &amp; Cabinets comptables</div>
        <div className="pricing-price">54 900 F <span>/mois</span></div>
        <div className="pricing-inheritance">Tout ce qui est dans Pro, plus :</div>
        <ul className="pricing-features">
          <li>Module Opérations &amp; Assistant Opérationnel (gestion stocks)</li>
          <li>Multi-utilisateurs &amp; rôles avancés (RBAC étanche)</li>
          <li>Clés API développeurs &amp; exports pour ERP</li>
          <li>Orchestration de workflows personnalisés</li>
        </ul>
        <div className="pricing-contract">
          <strong>Contrat &amp; délivrables à l'achat :</strong> Engagement contractuel de conformité Loi n°2024/017 signé, audit initial de vos flux financiers sur place ou à distance, et Account Manager dédié joignable par téléphone.
        </div>
        <button className="pricing-btn" onClick={() => { document.getElementById('demo')?.scrollIntoView({behavior:'smooth'}) }}>Choisir Business</button>
      </div>
    </div>
  </div>
</section>

<section>
  <div className="wrap">
    <div className="section-head reveal-scroll">
      <span className="section-label">Pensé pour le terrain</span>
      <h2>Bâti avec des <span className="mkt-highlight">entrepreneurs africains</span>, pour des entrepreneurs africains</h2>
      <p>Elara s'inspire de la façon dont les PME de Douala, Lagos ou Dakar gèrent déjà leur activité — pas d'une méthode importée.</p>
    </div>
    <div className="proof-grid reveal-scroll">
      <div className="proof-card">
        <div className="no-image-anim" aria-hidden="true"></div>
        <img src="https://images.pexels.com/photos/20209020/pexels-photo-20209020.jpeg?auto=compress&cs=tinysrgb&w=700" alt="Entrepreneure souriante à son bureau à Kinshasa" />
        <div className="proof-caption">Entrepreneure, Kinshasa</div>
      </div>
      <div className="proof-card">
        <div className="no-image-anim" aria-hidden="true"></div>
        <img src="https://images.pexels.com/photos/9301257/pexels-photo-9301257.jpeg?auto=compress&cs=tinysrgb&w=700" alt="Présentation des résultats commerciaux à l'équipe" />
        <div className="proof-caption">Présentation du Business Health Score</div>
      </div>
      <div className="proof-card">
        <div className="no-image-anim" aria-hidden="true"></div>
        <img src="https://images.pexels.com/photos/5668518/pexels-photo-5668518.jpeg?auto=compress&cs=tinysrgb&w=700" alt="Entrepreneures discutant de la stratégie de leur entreprise" />
        <div className="proof-caption">Pilotage financier au quotidien</div>
      </div>
    </div>
  </div>
</section>

<section className="section-ink" id="confiance">
  <div className="wrap">
    <div className="trust-wrap">
      <div className="no-image-anim" aria-hidden="true"></div>
      <div>
        <div className="section-head reveal-scroll">
          <span className="section-label">Confiance & conformité</span>
          <h2>Conçu pour rassurer banques et <span className="mkt-highlight">grandes entreprises</span></h2>
          <p>Sécurité, traçabilité et validation humaine sont intégrées dès la conception.</p>
        </div>
        <div className="trust-grid reveal-scroll">
          <div className="trust-item">
            <span className="trust-dot"></span>
            <div><h4>Chiffrement bout en bout</h4><p>Données chiffrées au repos et en transit, documents sensibles sur-protégés.</p></div>
          </div>
          <div className="trust-item">
            <span className="trust-dot"></span>
            <div><h4>Isolation par entreprise</h4><p>Chaque client dispose d'un espace logiquement isolé (Row Level Security).</p></div>
          </div>
          <div className="trust-item">
            <span className="trust-dot"></span>
            <div><h4>Audit trail complet</h4><p>Chaque action métier et chaque action Avancé est journalisée et consultable.</p></div>
          </div>
          <div className="trust-item">
            <span className="trust-dot"></span>
            <div><h4>Validation humaine</h4><p>Aucune action sensible — facture, message, paiement — sans votre accord explicite.</p></div>
          </div>
          <div className="trust-item">
            <span className="trust-dot"></span>
            <div><h4>Conforme à la loi camerounaise</h4><p>Aligné sur la Loi n°2024/017 relative à la protection des données personnelles.</p></div>
          </div>
          <div className="trust-item">
            <span className="trust-dot"></span>
            <div><h4>Infrastructure managée</h4><p>Hébergement cloud managé, sauvegardes régulières, plan de reprise après sinistre.</p></div>
          </div>
        </div>
      </div>
      <img className="trust-photo reveal-scroll" src="https://images.pexels.com/photos/7793994/pexels-photo-7793994.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Dirigeant d'entreprise au téléphone dans un environnement professionnel" />
    </div>
  </div>
</section>

<section id="demo" className="demo-section">
  <div className="wrap demo-grid">
    <div className="demo-copy reveal-scroll">
      <span className="section-label">Prochaine étape</span>
      <h2>Voyez Elara sur vos <span className="mkt-highlight">propres données</span></h2>
      <p>Envoyez-nous quelques documents et nous vous montrons, en 20 minutes, ce qu'Elara révèle sur votre entreprise — gratuitement, sans engagement.</p>
      <div className="demo-points">
        <div className="demo-point"><span className="check">✓</span> Diagnostic personnalisé à partir de vos vrais documents</div>
        <div className="demo-point"><span className="check">✓</span> Restitution de votre Business Health Score</div>
        <div className="demo-point"><span className="check">✓</span> Aucune remise à plat de vos outils actuels</div>
        <div className="demo-point"><span className="check">✓</span> Réponse sous 48h ouvrées</div>
      </div>
    </div>

    <div>
      <form className="demo-form reveal-scroll" id="demoForm" style={{ display: formSubmitted ? "none" : "block" }} onSubmit={handleDemoSubmit}>
        <div className="form-row">
          <div className="field-group">
            <label htmlFor="fname">Prénom</label>
            <input type="text" id="fname" name="fname" required />
          </div>
          <div className="field-group">
            <label htmlFor="lname">Nom</label>
            <input type="text" id="lname" name="lname" required />
          </div>
        </div>
        <div className="form-row">
          <div className="field-group">
            <label htmlFor="email">Email professionnel</label>
            <input type="email" id="email" name="email" required />
          </div>
          <div className="field-group">
            <label htmlFor="phone">Téléphone / WhatsApp</label>
            <input type="tel" id="phone" name="phone" placeholder="+237 ..." required />
          </div>
        </div>
        <div className="form-row">
          <div className="field-group">
            <label htmlFor="company">Entreprise</label>
            <input type="text" id="company" name="company" required />
          </div>
          <div className="field-group">
            <label htmlFor="profile">Formule visée</label>
            <select id="profile" name="profile" required defaultValue="">
              <option value="" disabled>Choisir une formule...</option>
              <option>Freemium (0 F)</option>
              <option>Starter (9 900 F/mois)</option>
              <option>Pro (24 900 F/mois)</option>
              <option>Business (54 900 F/mois)</option>
              <option>Cabinet comptable / Déploiement groupé</option>
            </select>
          </div>
        </div>
        <div className="field-group">
          <label htmlFor="message">Un mot sur votre activité (optionnel)</label>
          <textarea id="message" name="message" placeholder="Secteur, taille de l'équipe, principal défi de pilotage..."></textarea>
        </div>
        <button type="submit" className="submit-btn">Demander ma démo gratuite</button>
        <p className="form-note">Vos informations restent confidentielles et ne sont utilisées que pour organiser votre démonstration.</p>
      </form>

      <div className={`demo-form form-success ${formSubmitted ? "show" : ""}`} id="formSuccess">
        <div className="check-big">✓</div>
        <h3>Demande envoyée</h3>
        <p>Merci — un membre de l'équipe Elara vous contacte sous 48h ouvrées pour organiser votre démonstration.</p>
      </div>
    </div>
  </div>
</section>

<footer>
  <div className="wrap">
    <div className="foot-top">
      <div className="foot-brand-col">
        <a className="brand" href="#top" aria-label="Elara — accueil">
          <svg width="26" height="22" viewBox="0 0 30 26" fill="none" aria-hidden="true">
            <path d="M0 13 L6 13 L8.5 3 L12 23 L15.5 8 L18.5 18 L21 13 L30 13" stroke="url(#footLogoGrad)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            <defs><linearGradient id="footLogoGrad" x1="0" y1="0" x2="30" y2="0"><stop stopColor="#D9A64A"/><stop offset="1" stopColor="#6FA890"/></linearGradient></defs>
          </svg>
          Elara
        </a>
        <p className="foot-tagline">Le cerveau numérique des PME et cabinets comptables d'Afrique.</p>
      </div>
      <div className="foot-col">
        <h4>Produit</h4>
        <a href="#produit">Comment ça marche</a>
        <a href="#tarifs">Paliers &amp; tarifs</a>
        <a href="#confiance">Sécurité &amp; conformité</a>
        <a href="#demo">Demander une démo</a>
      </div>
      <div className="foot-col">
        <h4>Entreprise</h4>
        <a href="mailto:contact@elara.app">contact@elara.app</a>
        <a href="#">Douala, Cameroun</a>
        <a href="#">À propos</a>
      </div>
      <div className="foot-col">
        <h4>Légal</h4>
        <a href="#">Conditions d'utilisation</a>
        <a href="#">Confidentialité</a>
        <a href="#">Conformité Loi n°2024/017</a>
      </div>
    </div>
    <div className="foot-row">
      <div className="foot-meta">© 2026 Elara. Tous droits réservés.</div>
      <div className="foot-meta">www.elara.app · Douala, Cameroun</div>
    </div>
  </div>
</footer>


    </div>
  );
}

