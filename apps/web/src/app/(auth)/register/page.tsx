'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { inscrire } from './actions'

const SECTEURS = ["Services", "Distribution", "Commerce", "Industrie légère", "Restauration", "Santé", "Éducation", "BTP & construction", "Autre"]

const champ: React.CSSProperties = {
  padding: '12px 16px',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  outline: 'none',
  width: '100%',
  background: '#fff',
}

const etiquette: React.CSSProperties = { fontSize: '14px', fontWeight: 500, color: 'var(--text-main)' }

export default function RegisterPage() {
  const router = useRouter()
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, demarrer] = useTransition()

  // Soumission via `onSubmit` et non via l'attribut `action` du formulaire :
  // passé en `action`, le navigateur soumettait le formulaire nativement, sans
  // appel à l'API. Rien ne se créait et l'écran restait muet.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErreur(null)
    demarrer(async () => {
      const res = await inscrire(new FormData(e.currentTarget))
      if (res?.error) {
        setErreur(res.error)
        return
      }
      // Le compte existe : on renvoie vers la connexion avec l'adresse saisie.
      router.push('/login?inscrit=1')
    })
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)', padding: '24px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <svg width="40" height="40" viewBox="0 0 30 26" style={{ margin: '0 auto 16px' }}>
            <path d="M0 13 L6 13 L8.5 3 L12 23 L15.5 8 L18.5 18 L21 13 L30 13" fill="none" stroke="#A9761F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="section-title" style={{ fontSize: '24px' }}>Créer votre compte</h1>
          <p className="section-sub">Vous créez votre première entreprise, puis vous y déposez vos documents.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {erreur && <div style={{ color: 'red', fontSize: '14px', textAlign: 'center', background: '#ffebee', padding: '10px', borderRadius: '8px' }}>{erreur}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="raison_sociale" style={etiquette}>Raison sociale *</label>
            <input id="raison_sociale" name="raison_sociale" placeholder="Nom légal de l'entreprise" required style={champ} />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label htmlFor="prenom" style={etiquette}>Prénom *</label>
              <input id="prenom" name="prenom" required style={champ} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label htmlFor="nom" style={etiquette}>Nom *</label>
              <input id="nom" name="nom" required style={champ} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="email" style={etiquette}>E-mail *</label>
            <input id="email" name="email" type="email" required style={champ} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="mot_de_passe" style={etiquette}>Mot de passe *</label>
            <input id="mot_de_passe" name="mot_de_passe" type="password" required minLength={10} placeholder="10 caractères minimum" style={champ} />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label htmlFor="pays" style={etiquette}>Pays</label>
              <input id="pays" name="pays" placeholder="Cameroun" style={champ} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label htmlFor="ville" style={etiquette}>Ville</label>
              <input id="ville" name="ville" placeholder="Douala" style={champ} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '110px' }}>
              <label htmlFor="devise" style={etiquette}>Devise</label>
              <input id="devise" name="devise" defaultValue="XAF" maxLength={3} style={champ} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label htmlFor="secteur" style={etiquette}>Secteur</label>
              <select id="secteur" name="secteur" style={champ} defaultValue="">
                <option value="">Non précisé</option>
                {SECTEURS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label htmlFor="systeme_comptable" style={etiquette}>Système comptable</label>
              <select id="systeme_comptable" name="systeme_comptable" style={champ} defaultValue="SYSCOHADA">
                <option value="SYSCOHADA">SYSCOHADA</option>
                <option value="PCG">PCG</option>
                <option value="IFRS">IFRS</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '6px', opacity: enCours ? 0.7 : 1 }} disabled={enCours}>
            {enCours ? 'Création...' : 'Créer mon compte et mon entreprise'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--text-dim)' }}>
          Vous avez déjà un compte ?{' '}
          <Link href="/login" style={{ color: '#1A4A3C', fontWeight: 600 }}>Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
