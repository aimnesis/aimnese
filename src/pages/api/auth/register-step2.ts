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
    const body = req.body as Record<string, unknown>

    const userId = String(body.userId || '')
    if (!userId) {
      res.status(400).json({ ok: false, error: 'userId obrigatório' })
      return
    }

    const title = typeof body.title === 'string' ? body.title : undefined
    const cpf = typeof body.cpf === 'string' ? body.cpf : undefined
    const birthDate = typeof body.birthDate === 'string' ? body.birthDate : undefined
    const crm = typeof body.crm === 'string' ? body.crm : undefined
    // suporta crmUF ou crmUf
    const crmUF = typeof body.crmUF === 'string'
      ? (body.crmUF as string)
      : (typeof body.crmUf === 'string' ? (body.crmUf as string) : undefined)

    const specialty = typeof body.specialty === 'string' ? body.specialty : undefined
    const city = typeof body.city === 'string' ? body.city : undefined
    const stateUF = typeof body.stateUF === 'string' ? body.stateUF : undefined
    const firstName = typeof body.firstName === 'string' ? body.firstName : undefined
    const lastName = typeof body.lastName === 'string' ? body.lastName : undefined

    const cpfClean = cpf ? cpf.replace(/\D/g, '') : undefined
    const medicalLicenseId =
      crm && crmUF ? `${crm}-${crmUF}`.replace(/\s+/g, '') : undefined

    await prisma.doctorProfile.update({
      where: { userId },
      data: {
        title: title ?? undefined,
        cpf: cpfClean ?? undefined,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        crm: crm ?? undefined,
        crmUF: crmUF ?? undefined,
        specialty: specialty ?? undefined,
        city: city ?? undefined,
        stateUF: stateUF ?? undefined,
        isVerified: false,
        verifiedAt: null,
      },
    })

    await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        name: [firstName, lastName].filter(Boolean).join(' ') || undefined,
        medicalLicenseId: medicalLicenseId ?? undefined,
        isVerified: false,
      },
    })

    res.status(200).json({ ok: true })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      res.status(400).json({ ok: false, error: 'CPF ou CRM/UF já cadastrado.' })
      return
    }
    console.error('register-step2 error', e)
    res.status(500).json({ ok: false, error: 'Internal error' })
  }
}