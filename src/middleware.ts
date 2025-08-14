// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'

const SUPPORTED = ['pt', 'en'] as const
type SupportedLocale = typeof SUPPORTED[number]
const DEFAULT: SupportedLocale = 'en'

function isSupportedLocale(v: string | null | undefined): v is SupportedLocale {
  return !!v && (SUPPORTED as readonly string[]).includes(v)
}

function countryToLocale(country: string | null): SupportedLocale {
  if (!country) return DEFAULT
  const c = country.toLowerCase()
  if (c === 'br' || c === 'pt') return 'pt'
  if (c === 'us' || c === 'ca' || c === 'gb') return 'en'
  return DEFAULT
}

function parseAcceptLanguage(header: string | null): SupportedLocale | null {
  if (!header) return null
  const langs = header.split(',').map((l) => l.trim().split(';')[0])
  for (const lang of langs) {
    if (lang.startsWith('pt')) return 'pt'
    if (lang.startsWith('en')) return 'en'
  }
  return null
}

export function middleware(req: NextRequest) {
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value
  if (isSupportedLocale(cookieLocale)) {
    return NextResponse.next()
  }

  const countryHeader = req.headers.get('x-vercel-ip-country')
  let locale: SupportedLocale = countryToLocale(countryHeader)

  const fromHeader = parseAcceptLanguage(req.headers.get('accept-language'))
  if (fromHeader) locale = fromHeader

  const res = NextResponse.next()
  res.cookies.set('NEXT_LOCALE', isSupportedLocale(locale) ? locale : DEFAULT, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}

// Evita rodar em assets, dados estáticos e APIs
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|api|auth).*)',
  ],
}