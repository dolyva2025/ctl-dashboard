'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'
import { ADMIN_EMAIL, ADMIN_DISPLAY_NAME, isAdmin } from './config'

export type TctlUser = {
  id: string
  name: string
  personalName: string
  email: string
  isPremium: boolean
}

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<TctlUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const email = session.user.email!
        const rawName = session.user.user_metadata?.name || email.split('@')[0]
        const admin = isAdmin(email)
        setUser({
          id: session.user.id,
          email,
          name: admin ? ADMIN_DISPLAY_NAME : rawName,
          personalName: rawName,
          isPremium: admin,
        })
      } else {
        router.push('/login')
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const email = session.user.email!
        const rawName = session.user.user_metadata?.name || email.split('@')[0]
        const admin = isAdmin(email)
        setUser({
          id: session.user.id,
          email,
          name: admin ? ADMIN_DISPLAY_NAME : rawName,
          personalName: rawName,
          isPremium: admin,
        })
      } else {
        setUser(null)
        router.push('/login')
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
  }

  return { user, loading, logout }
}
