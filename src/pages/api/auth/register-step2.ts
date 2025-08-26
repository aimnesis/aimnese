// src/pages/api/auth/register-step2.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

type ApiOk = { ok: true }
type ApiErr = { ok: false; error: string }

function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('DB_TIMEOUT')), ms)
    p.then(v => { clearTimeout(t); resolve(v) })
     .catch(e => { clearTimeout(t); reject(e) })
  })
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>
) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const { userId, phone, whatsapp, cpf, crm, crmUF, specialty } = req.body as any
    if (!userId) return res.status(400).json({ ok: false, error: 'userId obrigatório' })

    const cpfClean = cpf ? String(cpf).replace(/\D/g, '').slice(0, 11) : undefined
    const phoneClean = phone ? String(phone).replace(/\D/g, '').slice(0, 11) : undefined
    const whatsClean = whatsapp ? String(whatsapp).replace(/\D/g, '').slice(0, 11) : undefined
    const medicalLicenseId = crm && crmUF ? `${String(crm).replace(/\D/g, '')}-${crmUF}` : undefined

    // garante que existe e atualiza (1:1)
    await withTimeout(prisma.doctorProfile.upsert({
      where: { userId },
      create: {
        userId,
        cpf: cpfClean,
        // birthDate removido
        crm: crm ? String(crm).replace(/\D/g, '') : undefined,
        crmUF: crmUF ?? undefined,
        specialty: specialty ?? undefined,
        phone: phoneClean ?? undefined,
        whatsapp: whatsClean ?? undefined,
        isVerified: false
      },
      update: {
        cpf: cpfClean ?? undefined,
        // birthDate removido
        crm: crm ? String(crm).replace(/\D/g, '') : undefined,
        crmUF: crmUF ?? undefined,
        specialty: specialty ?? undefined,
        phone: phoneClean ?? undefined,
        whatsapp: whatsClean ?? undefined,
        isVerified: false,
        verifiedAt: null
      }
    }), 8000)

    await withTimeout(prisma.user.update({
      where: { id: userId },
      data: {
        medicalLicenseId: medicalLicenseId ?? undefined,
        isVerified: false
      }
    }), 8000)

    res.status(200).json({ ok: true })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return res.status(400).json({ ok: false, error: 'CPF já cadastrado.' })
    }
    if (e?.message === 'DB_TIMEOUT') {
      return res.status(504).json({ ok: false, error: 'Banco demorou a responder. Tente novamente.' })
    }
    console.error('register-step2 error', e)
    res.status(500).json({ ok: false, error: 'Internal error' })
  }
}