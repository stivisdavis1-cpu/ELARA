'use client'

import React, { useState } from 'react'
import { login } from './actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const res = await login(formData)
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    }
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

        <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && <div style={{ color: 'red', fontSize: '14px', textAlign: 'center', background: '#ffebee', padding: '10px', borderRadius: '8px' }}>{error}</div>}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="email" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-main)' }}>Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              placeholder="admin-pro@elara.test" 
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px', opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Connexion...' : 'Accéder à mon espace'}
          </button>
        </form>
      </div>
    </div>
  )
}
