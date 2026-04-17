'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos.')
      setLoading(false)
      return
    }
    router.push('/')
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Por favor ingresa tu nombre.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name.trim() } },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center mx-auto shadow-md">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">The Collective Trade Lab</h1>
            <p className="text-sm text-zinc-500 mt-1">Accede al dashboard de trading</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 space-y-5">

          {/* Tabs */}
          <div className="flex bg-zinc-100 rounded-xl p-1">
            <button
              onClick={() => { setTab('login'); setError('') }}
              className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${tab === 'login' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setTab('signup'); setError('') }}
              className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${tab === 'signup' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
            >
              Crear cuenta
            </button>
          </div>

          {/* Login form */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Correo electrónico</label>
                <input type="email" placeholder="tu@correo.com" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 transition" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Contraseña</label>
                <input type="password" placeholder="••••••••" required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 transition" />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-zinc-900 hover:bg-black disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors">
                {loading ? 'Entrando...' : 'Entrar →'}
              </button>
            </form>
          )}

          {/* Signup form */}
          {tab === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Nombre</label>
                <input type="text" placeholder="¿Cómo te llamas?" required value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 transition" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Correo electrónico</label>
                <input type="email" placeholder="tu@correo.com" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 transition" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Contraseña</label>
                <input type="password" placeholder="Mínimo 6 caracteres" minLength={6} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 transition" />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-zinc-900 hover:bg-black disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors">
                {loading ? 'Creando cuenta...' : 'Crear cuenta →'}
              </button>
            </form>
          )}

          <p className="text-xs text-zinc-400 text-center">Sin tarjeta de crédito. Solo trading.</p>
        </div>

        <p className="text-center text-xs text-zinc-400">
          The Collective Trade Lab · En español · Futuros
        </p>
      </div>
    </div>
  )
}
