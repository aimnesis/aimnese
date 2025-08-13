// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'

const SUPPORTED = ['pt', 'en']
const DEFAULT = 'en'

function countryToLocale(country: string | null): string {
  if (!country) return DEFAULT
  const c = country.toLowerCase()
  if (c === 'br' || c === 'pt') return 'pt'
  if (c === 'us' || c === 'ca' || c === 'gb') return 'en'
  return DEFAULT
}

function parseAcceptLanguage(header: string | null): string | null {
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
  if (cookieLocale && SUPPORTED.includes(cookieLocale)) return NextResponse.next()

  const countryHeader = req.headers.get('x-vercel-ip-country') || null
  let locale = countryToLocale(countryHeader)

  if (!SUPPORTED.includes(locale)) {
    const accept = req.headers.get('accept-language')
    const fromHeader = parseAcceptLanguage(accept)
    if (fromHeader) locale = fromHeader
  }

  const res = NextResponse.next()
  res.cookies.set('NEXT_LOCALE', SUPPORTED.includes(locale) ? locale : DEFAULT, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}

// exclui _next, assets, favicon, e também /api e /auth
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|auth).*)'],
}