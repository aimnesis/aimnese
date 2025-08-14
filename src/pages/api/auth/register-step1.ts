// src/pages/api/auth/register-step1.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'

type ApiOk = { ok: true; userId: string }
type ApiErr = { ok: false; error: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>
) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const { email, password, firstName, lastName, name } = req.body as {
      email?: string
      password?: string
      firstName?: string
      lastName?: string
      name?: string
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      res.status(400).json({ ok: false, error: 'E-mail inválido' })
      return
    }
    if (!password || password.length < 8) {
      res.status(400).json({ ok: false, error: 'Senha inválida (mín. 8 caracteres)' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const derivedName = [firstName, lastName].filter(Boolean).join(' ').trim()
    const computedName = name ?? (derivedName ? derivedName : undefined)

    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: {
        password: passwordHash,
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        name: computedName,
      },
      create: {
        email: email.toLowerCase(),
        password: passwordHash,
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        name: computedName,
        isVerified: false,
      },
      select: { id: true },
    })

    await prisma.doctorProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    })

    res.status(200).json({ ok: true, userId: user.id })
  } catch (e) {
    console.error('register-step1 error', e)
    res.status(500).json({ ok: false, error: 'Internal error' })
  }
}