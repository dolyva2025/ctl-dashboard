import type { Metadata } from 'next'
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { NavWrapper } from '@/components/NavWrapper'
import { PreviewProvider } from '@/lib/previewContext'
import { ThemeProvider } from '@/lib/themeContext'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

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
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Prevent flash: apply saved theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (localStorage.getItem('ctl-theme') === 'navy') {
              document.documentElement.classList.add('dark')
            }
          } catch {}
        ` }} />
      </head>
      <body className={`${bricolage.variable} ${jakarta.variable} ${jakarta.className} antialiased`}>
        <ThemeProvider>
          <PreviewProvider>
            <NavWrapper />
            <main className="px-4 py-8 sm:px-8">{children}</main>
            <footer className="border-t border-border mt-12 px-6 py-6">
              <p className="text-xs text-muted-foreground text-center max-w-3xl mx-auto leading-relaxed">
                Este contenido es exclusivamente educativo y no constituye asesoramiento financiero. El trading de futuros conlleva un riesgo significativo de pérdida. Todas las decisiones de inversión y trading son responsabilidad exclusiva del usuario.
              </p>
            </footer>
          </PreviewProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
