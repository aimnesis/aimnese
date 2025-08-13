// src/pages/_app.tsx
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider, useTheme } from 'next-themes'
import { useEffect } from 'react'
import '@/styles/globals.css'

/**
 * Define o tema automaticamente:
 *  - 06:00–18:00 -> light
 *  - 18:00–06:00 -> dark
 * Ainda permite o usuário trocar manualmente (persistido em localStorage).
 */
function AutoTheme() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  useEffect(() => {
    // Se o usuário já escolheu manualmente (salvo pelo next-themes),
    // não forçamos nada.
    const manual = localStorage.getItem('theme')
    if (manual) return

    const hour = new Date().getHours()
    const preferred = hour >= 6 && hour < 18 ? 'light' : 'dark'
    setTheme(preferred)
  }, [setTheme])

  // Ajusta a classe .dark no <html> de acordo com o tema atual
  useEffect(() => {
    const root = document.documentElement
    if ((theme ?? resolvedTheme) === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme, resolvedTheme])

  return null
}

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"      // usa classe .dark
        defaultTheme="system"  // fallback: segue sistema
        enableSystem={true}
        storageKey="theme"     // salva escolha manual
      >
        <AutoTheme />
        <Component {...pageProps} />
      </ThemeProvider>
    </SessionProvider>
  )
}