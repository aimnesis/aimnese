// src/components/Layout.tsx
'use client'

import { PropsWithChildren, useEffect, useMemo } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { Inter } from 'next/font/google'

const Navbar = dynamic(() => import('./Navbar'), { ssr: false })

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '600', '700'],
  display: 'swap',
})

interface LayoutProps {
  title?: string
  description?: string
  canonicalPath?: string
}

export default function Layout({
  title = 'Aimnesis',
  description = 'A plataforma líder de informação médica.',
  canonicalPath,
  children,
}: PropsWithChildren<LayoutProps>) {
  const base = process.env.NEXT_PUBLIC_APP_URL || ''
  const canonical = useMemo(() => {
    if (!canonicalPath) return undefined
    try {
      return new URL(canonicalPath, base || 'http://localhost:3000').toString()
    } catch {
      return undefined
    }
  }, [canonicalPath, base])

  // previne margin default em alguns UAs antigos
  useEffect(() => {
    document.body.style.margin = '0'
  }, [])

  const titleTemplate = title ? `${title} · Aimnesis` : 'Aimnesis'

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <title>{titleTemplate}</title>
        <meta name="description" content={description} />

        {/* Mobile-first + safe areas */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        {/* Ajuda o browser a escolher paleta para UI */}
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0b0f14" media="(prefers-color-scheme: dark)" />

        {canonical && <link rel="canonical" href={canonical} />}

        {/* OG/Twitter */}
        <meta property="og:title" content={titleTemplate} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        {canonical && <meta property="og:url" content={canonical} />}
        <meta property="og:image" content="/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={titleTemplate} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="/og-image.png" />

        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={`${inter.className} min-h-[100dvh] bg-app flex flex-col`}>
        {/* Header fixo (sem CLS) */}
        <header className="sticky top-0 z-20 h-14 border-b border-base bg-panel/90 backdrop-blur-sm">
          <Navbar />
        </header>

        {/* Main em coluna; Composer é sticky, então nada de overlay */}
        <main id="main-content" className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </>
  )
}