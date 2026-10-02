"use client";
import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { selectionnerEntrepriseAction } from "@/lib/actions";
import { Icons } from "./Icons";

const pages = [
  {id:'dashboard', label:'Tableau de bord', icon: 'grid', section:'Espace entreprise'},
  {id:'scanner',   label:'Business Scanner', icon: 'scan'},
  {id:'cfo',       label:'CFO', icon: 'cfo'},
  {id:'commercial',label:'Commercial', icon: 'commercial'},
  {id:'ops',       label:'Opérations', icon: 'ops'},
  {id:'report',    label:'Rapport', icon: 'report'},
  {id:'assistant', label:'Assistant', icon: 'assistant'},
  {id:'clients',   label:'Clients & fournisseurs', icon: 'contacts', section:'Relations & données'},
  {id:'documents', label:'Documents', icon: 'docs'},
  {id:'docgen',    label:'Génération de documents', icon: 'gen'},
  {id:'users',     label:'Utilisateurs & rôles', icon: 'users'},
  {id:'settings',  label:'Paramètres & abonnement', icon: 'settings'},
  {id:'team',      label:'Employés', icon: 'badge', section:'Organisation & automatisation'},
  {id:'workflows', label:'Concepteur de workflows', icon: 'flow'},
  {id:'agents',    label:'Agents & Extensions', icon: 'puzzle', section:'Écosystème Avancé'},
  {id:'admin',     label:'Santé plateforme', icon: 'health', section:'Console admin'},
  {id:'security',  label:'Sécurité & gouvernance', icon: 'shield'},
  {id:'architecture', label:'Architecture technique', icon: 'layers'},
  {id:'roadmap',   label:'Feuille de route', icon: 'flag', section:'Vision produit'},
  {id:'mobile',    label:'Aperçu mobile', icon: 'mobile', section:'Autres surfaces'},
  {id:'onboarding',label:'Onboarding', icon: 'wand'},
  {id:'brand',     label:'Système de marque', icon: 'logo'},
];

export type OrganisationSidebar = {
  id: string;
  raison_sociale: string;
  ville: string | null;
  plan: string | null;
  role: string;
  principale: boolean;
};

export const Sidebar = ({
  organisations = [],
  tenantCourant = null,
}: {
  organisations?: OrganisationSidebar[];
  tenantCourant?: string | null;
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [enCours, changer] = React.useTransition();

  React.useEffect(() => {
    const shell = document.querySelector('.shell');
    if (shell) {
      if (isCollapsed) shell.classList.add('sidebar-collapsed');
      else shell.classList.remove('sidebar-collapsed');
    }
  }, [isCollapsed]);

  const courante =
    organisations.find((o) => o.id === tenantCourant) ??
    organisations.find((o) => o.principale) ??
    organisations[0] ??
    null;

  const initiales = courante
    ? courante.raison_sociale
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((m) => m[0]?.toUpperCase() ?? '')
        .join('') || courante.raison_sociale.slice(0, 2).toUpperCase()
    : '—';

  /**
   * Changer d'entreprise ne se fait pas par un lien : la sélection est
   * mémorisée côté serveur, puis la page est rechargée pour que toutes les
   * données soient ré-interrogées sur le nouveau tenant.
   */
  const basculer = (id: string) => {
    if (!id || id === courante?.id) return;
    changer(async () => {
      const r = await selectionnerEntrepriseAction(id);
      if (r.ok) router.refresh();
    });
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} aria-label="Navigation principale">
      <div className="brand" style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', position: 'relative' }}>
        {!isCollapsed && (
          <>
            <svg width="30" height="26" viewBox="0 0 30 26" fill="none" aria-hidden="true">
              <path d="M0 13 L6 13 L8.5 3 L12 23 L15.5 8 L18.5 18 L21 13 L30 13" stroke="url(#g1)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
              <defs><linearGradient id="g1" x1="0" y1="0" x2="30" y2="0"><stop stopColor="#A9761F"/><stop offset="1" stopColor="#1A4A3C"/></linearGradient></defs>
            </svg>
            <div>
              <div className="brand-word">Elara</div>
              <div className="brand-tag">Tenant workspace</div>
            </div>
          </>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            position: 'absolute', right: isCollapsed ? '50%' : '8px', transform: isCollapsed ? 'translateX(50%)' : 'none',
            background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px'
          }}
          title="Basculer le menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <nav className="nav" aria-label="Sections du produit" style={{ overflow: isCollapsed ? 'hidden' : 'auto' }}>
        {pages.map((p, index) => {
          const IconComponent = Icons[p.icon as keyof typeof Icons];
          const isActive = pathname === `/${p.id}`;
          return (
            <React.Fragment key={p.id}>
              {p.section && !isCollapsed && <div className="nav-section" style={{ marginTop: index === 0 ? 0 : '16px' }}>{p.section}</div>}
              <Link href={`/${p.id}`} className={isActive ? "active" : ""} title={p.label} style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', paddingLeft: isCollapsed ? '0' : '14px' }}>
                {IconComponent && <IconComponent />} {!isCollapsed && <span>{p.label}</span>}
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <div className="tenant-card" style={{ padding: isCollapsed ? '8px' : '12px', justifyContent: 'center' }}>
          <div className="tenant-avatar" aria-hidden="true" title={courante?.raison_sociale ?? "Aucune entreprise"}>
            {initiales}
          </div>
          {!isCollapsed && (
            <div style={{ minWidth: 0, flex: 1 }}>
              {courante ? (
                <>
                  {organisations.length > 1 ? (
                    <label className="tenant-switch" title="Changer d'entreprise">
                      <span className="sr-only">Entreprise courante</span>
                      <select
                        className="tenant-name"
                        value={courante.id}
                        disabled={enCours}
                        onChange={(e) => basculer(e.target.value)}
                      >
                        {organisations.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.raison_sociale}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div className="tenant-name" title={courante.raison_sociale}>
                      {courante.raison_sociale}
                    </div>
                  )}
                  <div className="tenant-meta">
                    {[courante.ville, courante.plan].filter(Boolean).join(" · ") || "Aucune ville renseignée"}
                  </div>
                </>
              ) : (
                <>
                  <div className="tenant-name">Aucune entreprise</div>
                  <div className="tenant-meta">
                    <Link href="/onboarding">Créer mon entreprise</Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
