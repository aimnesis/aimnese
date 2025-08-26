// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const SUPPORTED = ['pt', 'en'] as const
type SupportedLocale = (typeof SUPPORTED)[number]
const DEFAULT_LOCALE: SupportedLocale = 'en'

function isSupportedLocale(v: string | null | undefined): v is SupportedLocale {
  return !!v && (SUPPORTED as readonly string[]).includes(v)
}

function countryToLocale(country: string | null): SupportedLocale {
  if (!country) return DEFAULT_LOCALE
  const c = country.toLowerCase()
  if (c === 'br' || c === 'pt') return 'pt'
  if (c === 'us' || c === 'ca' || c === 'gb') return 'en'
  return DEFAULT_LOCALE
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

export async function middleware(req: NextRequest) {
  const url = new URL(req.url)
  const pathname = url.pathname

  // ---------- Guard de ADMIN (somente páginas /admin, não APIs) ----------
  if (pathname.startsWith('/admin')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    // sem login -> vai pro login
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', url))
    }
    // sem role admin -> volta pro dashboard
    if ((token as any)?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', url))
    }
    // se admin ok, continua e cai no bloco de locale abaixo
  }

  // ---------- Locale cookie (para páginas) ----------
  // Só define cookie se ainda não existir.
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value
  if (!isSupportedLocale(cookieLocale)) {
    const countryHeader = req.headers.get('x-vercel-ip-country')
    let locale: SupportedLocale = countryToLocale(countryHeader)
    const fromHeader = parseAcceptLanguage(req.headers.get('accept-language'))
    if (fromHeader) locale = fromHeader

    const res = NextResponse.next()
    res.cookies.set('NEXT_LOCALE', isSupportedLocale(locale) ? locale : DEFAULT_LOCALE, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    })
    return res
  }

  return NextResponse.next()
}

/**
 * Importante:
 *  - NÃO rodamos o middleware em /api para não interferir nos endpoints (ex.: general/studies grátis).
 *  - Também pulamos assets estáticos e rotas de auth.
 */
export const config = {
  matcher: [
    // Páginas, exceto assets, data, favicon, robots, sitemap, API e Auth
    '/((?!_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|api|auth).*)',
  ],
}