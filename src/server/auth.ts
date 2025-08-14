// src/server/auth.ts
import type { NextAuthOptions } from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // ---- Credentials (email + senha) ----
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { doctorProfile: true },
        })
        if (!user?.password) return null
        const ok = await bcrypt.compare(credentials.password, user.password)
        return ok ? { id: user.id, email: user.email, name: user.name || '' } : null
      },
    }),

    // ---- Email link (magic link) ----
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
  ],
  pages: { signIn: '/auth/signin' },
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, account }) {
      // Só restringimos magic link (provider === 'email')
      if (account?.provider === 'email') {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email || '' },
          include: { doctorProfile: true },
        })
        // Precisa ter perfil médico e estar verificado
        const allowed =
          !!dbUser?.doctorProfile &&
          dbUser.doctorProfile.isVerified === true

        if (!allowed) {
          // bloqueia magic link p/ incompletos/não verificados
          return false
        }
      }
      return true
    },
    async session({ session, token }) {
      if (session.user && token?.sub) session.user.id = token.sub
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}