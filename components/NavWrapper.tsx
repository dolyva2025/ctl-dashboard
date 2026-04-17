'use client'

import { usePathname } from 'next/navigation'
import { Nav } from './Nav'

export function NavWrapper() {
  const pathname = usePathname()
  if (pathname === '/login') return null
  return <Nav />
}
