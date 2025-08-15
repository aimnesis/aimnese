// src/server/auth.ts
import type { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import EmailProvider from 'next-auth/providers/email'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/signin' },
  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase()
        const password = credentials?.password
        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.password) return null

        const ok = await bcrypt.compare(password, user.password)
        if (!ok) return null

        // Retorne um objeto minimal de usuário
        return { id: user.id, email: user.email, name: user.name ?? undefined }
      },
    }),

    // Opcional: login por e-mail (Magic Link).
    // Só ativa se as ENV necessárias existirem.
    ...(process.env.EMAIL_SERVER_HOST &&
    process.env.EMAIL_SERVER_USER &&
    process.env.EMAIL_SERVER_PASSWORD &&
    process.env.EMAIL_FROM
      ? [
          EmailProvider({
            server: {
              host: process.env.EMAIL_SERVER_HOST,
              port: Number(process.env.EMAIL_SERVER_PORT || 587),
              auth: {
                user: process.env.EMAIL_SERVER_USER,
                pass: process.env.EMAIL_SERVER_PASSWORD,
              },
            },
            from: process.env.EMAIL_FROM,
          }),
        ]
      : []),
  ],
}