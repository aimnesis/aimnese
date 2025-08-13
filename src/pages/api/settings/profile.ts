// src/server/auth.ts
import type { AuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import EmailProvider from 'next-auth/providers/email'

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  // IMPORTANT: use a mutable array (no `as const`) to match the `Provider[]` requirement
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
      maxAge: 24 * 60 * 60,
    }),
  ],
  pages: { signIn: '/auth/signin' },
  session: { strategy: 'jwt' },
  callbacks: {
    async session({ session, token }: any) {
      if (session?.user) (session.user as any).id = token.sub
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
