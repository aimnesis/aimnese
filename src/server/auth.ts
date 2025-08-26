// src/server/auth.ts
import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      authorize: async (creds) => {
        const started = Date.now()
        try {
          if (!creds?.email || !creds?.password) return null
          const user = await prisma.user.findUnique({
            where: { email: creds.email.toLowerCase() },
            select: { id: true, email: true, password: true, name: true, isVerified: true, role: true, blocked: true }
          })
          if (!user?.password || user.blocked) return null
          const ok = await bcrypt.compare(creds.password, user.password)
          if (!ok) return null
          return { id: user.id, email: user.email, name: user.name || undefined, role: user.role || 'user' }
        } finally {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[nextauth] authorize(ms)=', Date.now() - started)
          }
        }
      }
    })
  ],

  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 }, // 30d
  pages: { signIn: '/auth/signin' },

  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id
      if ((user as any)?.role) token.role = (user as any).role
      // segura: se não veio do authorize, tenta carregar 1x (evita custo por request)
      if (!token.role && token.uid) {
        try {
          const u = await prisma.user.findUnique({ where: { id: String(token.uid) }, select: { role: true } })
          token.role = u?.role || 'user'
        } catch {}
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token?.uid) {
        ;(session.user as any).id = token.uid
        ;(session.user as any).role = (token as any)?.role || 'user'
      }
      return session
    }
  },

  debug: process.env.NODE_ENV !== 'production'
}