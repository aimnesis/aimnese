// src/pages/api/auth/register-step1.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

type ApiOk = { ok: true; userId: string }
type ApiErr = { ok: false; error: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    // valida / normaliza
    const { name, email, password } = (req.body || {}) as {
      name?: string; email?: string; password?: string
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'E-mail inválido' })
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ ok: false, error: 'Senha inválida (mín. 8 caracteres)' })
    }

    const emailNorm = email.trim().toLowerCase()
    const nameNorm = (name || '').trim() || null
    const hash = await bcrypt.hash(password, 10)

    // cria/atualiza usuário
    const user = await prisma.user.upsert({
      where: { email: emailNorm },
      update: { password: hash, name: nameNorm ?? undefined, isVerified: false },
      create: { email: emailNorm, password: hash, name: nameNorm, isVerified: false },
      select: { id: true },
    })

    // garante 1:1 do perfil (barato/rápido)
    await prisma.doctorProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    })

    // RESPONDE JÁ — nada de esperar e-mail, etc.
    return res.status(200).json({ ok: true, userId: user.id })
  } catch (e) {
    console.error('register-step1 error:', e)
    return res.status(500).json({ ok: false, error: 'Internal error' })
  }
}