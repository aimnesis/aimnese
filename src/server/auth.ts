// src/server/auth.ts
import type { NextAuthOptions } from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST!,
        port: Number(process.env.EMAIL_SERVER_PORT || 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER!,
          pass: process.env.EMAIL_SERVER_PASSWORD!,
        },
      },
      from: process.env.EMAIL_FROM!,
      maxAge: 24 * 60 * 60,
    }),

    // 👇 Novo: login com e-mail + senha
    CredentialsProvider({
      name: 'Email e senha',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email ?? ''
        const email = rawEmail.trim().toLowerCase()
        const password = credentials?.password ?? ''
        if (!email || !password) return null

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            firstName: true,
            lastName: true,
            image: true,
            password: true, // hash
          },
        })
        if (!user || !user.password) return null

        const ok = await bcrypt.compare(password, user.password)
        if (!ok) return null

        // Retorne o "User" para NextAuth
        return {
          id: user.id,
          email: user.email,
          name:
            user.name ??
            ((`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()) || user.email),
          image: user.image ?? undefined,
        }
      },
    }),
  ],
  pages: { signIn: '/auth/signup' },
  session: { strategy: 'jwt' },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token?.sub) session.user.id = token.sub
      return session
    },
    async redirect({ url, baseUrl }) {
      try {
        // Permite URLs relativas (ex.: /dashboard)
        if (url.startsWith('/')) {
          // Evita mandar o usuário de volta para /auth/* após login
          if (url.startsWith('/auth/')) return baseUrl + '/dashboard'
          return baseUrl + url
        }
        // Permite URLs do mesmo host
        const sameOrigin = new URL(url).origin === baseUrl
        if (sameOrigin) {
          if (url.includes('/auth/')) return baseUrl + '/dashboard'
          return url
        }
      } catch {}
      // Fallback seguro
      return baseUrl + '/dashboard'
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}