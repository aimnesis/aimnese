// src/pages/api/auth/register-step2.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

type ApiOk = { ok: true }
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
    const {
      userId,
      phone,
      whatsapp,
      cpf,
      birthDate,
      crm,
      crmUF,
      specialty,
    } = req.body as {
      userId?: string
      phone?: string
      whatsapp?: string
      cpf?: string
      birthDate?: string
      crm?: string
      crmUF?: string
      specialty?: string
    }

    if (!userId) {
      res.status(400).json({ ok: false, error: 'userId obrigatório' })
      return
    }

    const cpfClean = cpf ? String(cpf).replace(/\D/g, '').slice(0, 11) : undefined
    const phoneClean = phone ? String(phone).replace(/\D/g, '').slice(0, 11) : undefined
    const whatsClean = whatsapp ? String(whatsapp).replace(/\D/g, '').slice(0, 11) : undefined
    const medicalLicenseId =
      crm && crmUF ? `${String(crm).replace(/\D/g, '')}-${crmUF}` : undefined

    // atualiza profile 1:1
    await prisma.doctorProfile.update({
      where: { userId },
      data: {
        cpf: cpfClean ?? undefined,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        crm: crm ? String(crm).replace(/\D/g, '') : undefined,
        crmUF: crmUF ?? undefined,
        specialty: specialty ?? undefined,
        phone: phoneClean ?? undefined,
        whatsapp: whatsClean ?? undefined,
        isVerified: false,
        verifiedAt: null,
      },
    })

    // sincroniza campos no User
    await prisma.user.update({
      where: { id: userId },
      data: {
        medicalLicenseId: medicalLicenseId ?? undefined,
        isVerified: false,
      },
    })

    res.status(200).json({ ok: true })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      res.status(400).json({ ok: false, error: 'CPF já cadastrado.' })
      return
    }
    console.error('register-step2 error', e)
    res.status(500).json({ ok: false, error: 'Internal error' })
  }
}