// src/server/auth.ts
import type { NextAuthOptions } from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
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
      maxAge: 24 * 60 * 60, // 24h
    }),
  ],
  pages: { signIn: '/auth/signin' },
  session: { strategy: 'jwt' },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token?.sub) {
        // id está tipado via augmentation em src/types/next-auth.d.ts
        session.user.id = token.sub
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}