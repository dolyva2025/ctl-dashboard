import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import { NavWrapper } from '@/components/NavWrapper'
import { PreviewProvider } from '@/lib/previewContext'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'] })

export const metadata: Metadata = {
  title: 'Trade Lab — The Collective Trade Lab',
  description: 'Rutina pre-mercado, niveles diarios y diario de trades para traders de futuros.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${dmSans.className} antialiased bg-slate-50 text-slate-900`}>
        <PreviewProvider>
          <NavWrapper />
          <main className="px-4 py-8 sm:px-8">{children}</main>
        </PreviewProvider>
      </body>
    </html>
  )
}
