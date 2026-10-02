'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { login } from './actions'

/**
 * Formulaire de connexion.
 *
 * Le client ne gère que la soumission et l'affichage d'une erreur. L'indicateur
 * « compte créé » lui est transmis par la page, qui a déjà résolu l'URL.
 *
 * L'action est appelée depuis un `onSubmit` et non passée à l'attribut
 * `action` du formulaire : React ignore alors la valeur de retour, l'erreur
 * n'était jamais affichée et la page se rechargait, ce qui donnait l'impression
 * que le bouton ne servait à rien.
 */
export default function FormulaireConnexion({
  inscrit,
  erreurInitiale,
}: {
  inscrit: boolean
  erreurInitiale?: string
}) {
  const [error, setError] = useState<string | null>(erreurInitiale ?? null)
  const [enCours, demarrer] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    demarrer(async () => {
      const res = await login(new FormData(e.currentTarget))
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <svg width="40" height="40" viewBox="0 0 30 26" style={{ margin: '0 auto 16px' }}>
            <path d="M0 13 L6 13 L8.5 3 L12 23 L15.5 8 L18.5 18 L21 13 L30 13" fill="none" stroke="#A9761F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="section-title" style={{ fontSize: '24px' }}>Connexion à Elara</h1>
          <p className="section-sub">Authentification sécurisée</p>
        </div>

        {inscrit && (
          <div style={{ fontSize: '14px', textAlign: 'center', background: 'var(--green-bg)', color: '#1A4A3C', padding: '10px', borderRadius: '8px', marginBottom: '18px' }}>
            Compte créé. Connectez-vous pour continuer.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && <div style={{ color: 'red', fontSize: '14px', textAlign: 'center', background: '#ffebee', padding: '10px', borderRadius: '8px' }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="email" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-main)' }}>Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="vous@entreprise.com"
              required
              style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', transition: 'all 0.2s' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="password" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-main)' }}>Mot de passe</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              required
              style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', transition: 'all 0.2s' }}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px', opacity: enCours ? 0.7 : 1 }} disabled={enCours}>
            {enCours ? 'Connexion...' : 'Accéder à mon espace'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '14px', color: 'var(--text-dim)' }}>
          Pas encore de compte ?{' '}
          <Link href="/register" style={{ color: '#1A4A3C', fontWeight: 600 }}>Créer mon compte</Link>
        </p>
      </div>
    </div>
  )
}
