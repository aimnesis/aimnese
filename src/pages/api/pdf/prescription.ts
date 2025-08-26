// src/pages/api/pdf/prescription.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } },
}

type Doctor = { name?: string; crm?: string; uf?: string; city?: string; state?: string }
type Patient = { name?: string; age?: string | number; id?: string }
type RxItem = { name: string; dose?: string; route?: string; frequency?: string; duration?: string; notes?: string }
type Body = {
  title?: string
  doctor?: Doctor
  patient?: Patient
  goal?: string
  items: RxItem[]
  warnings?: { pair: string; severity: 'contraindicated' | 'major' | 'moderate' | 'minor'; note?: string }[]
  encounterId?: string
}

function wrapText(font: any, text: string, size: number, maxWidth: number) {
  const words = text.replace(/\r/g, '').split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const t = line ? line + ' ' + w : w
    if (font.widthOfTextAtSize(t, size) <= maxWidth) {
      line = t
    } else {
      if (line) lines.push(line)
      if (font.widthOfTextAtSize(w, size) > maxWidth) {
        let chunk = ''
        for (const ch of w) {
          const test = chunk + ch
          if (font.widthOfTextAtSize(test, size) <= maxWidth) chunk = test
          else { if (chunk) lines.push(chunk); chunk = ch }
        }
        if (chunk) { line = chunk } else { line = '' }
      } else {
        line = w
      }
    }
  }
  if (line) lines.push(line)
  return lines
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  let body: Body
  try {
    body = (req.body || {}) as Body
  } catch {
    res.status(400).json({ error: 'Invalid JSON' })
    return
  }

  const {
    title = 'Prescrição médica',
    doctor = {},
    patient = {},
    goal,
    items = [],
    warnings = [],
    encounterId,
  } = body

  try {
    const pdf = await PDFDocument.create()
    const pageMargin = 56
    const pageWidth = 595.28
    const pageHeight = 841.89
    const contentWidth = pageWidth - pageMargin * 2

    const fontRegular = await pdf.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

    let page = pdf.addPage([pageWidth, pageHeight])
    let y = pageHeight - pageMargin

    const drawHeader = () => {
      const head = title
      const docLine = [
        doctor.name || '',
        doctor.crm ? `CRM ${doctor.crm}${doctor.uf ? '/' + doctor.uf : ''}` : '',
        doctor.city || doctor.state ? `• ${[doctor.city, doctor.state].filter(Boolean).join(' / ')}` : '',
      ].filter(Boolean).join('  ')
      const patLine = [
        patient.name ? `Paciente: ${patient.name}` : undefined,
        patient.age ? `Idade: ${patient.age}` : undefined,
        patient.id ? `ID: ${patient.id}` : undefined,
      ].filter(Boolean).join('  •  ')

      page.drawText(head, { x: pageMargin, y: y - 2, size: 18, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
      y -= 24

      if (docLine) {
        page.drawText(docLine, { x: pageMargin, y, size: 10.5, font: fontRegular, color: rgb(0.32, 0.32, 0.32) })
        y -= 16
      }
      if (patLine) {
        page.drawText(patLine, { x: pageMargin, y, size: 10.5, font: fontRegular, color: rgb(0.32, 0.32, 0.32) })
        y -= 18
      }
      page.drawLine({ start: { x: pageMargin, y }, end: { x: pageWidth - pageMargin, y }, thickness: 0.7, color: rgb(0.8, 0.8, 0.8) })
      y -= 16
    }

    const ensureRoom = (need: number) => {
      if (y - need < pageMargin + 40) {
        page = pdf.addPage([pageWidth, pageHeight])
        y = pageHeight - pageMargin
        drawHeader()
      }
    }

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ title, doctor, patient, goal, items, warnings, encounterId }) + Date.now())
      .digest('hex')
      .slice(0, 16)

    // primeira página: cabeçalho
    drawHeader()

    // objetivo terapêutico
    if (goal) {
      ensureRoom(30)
      page.drawText('Objetivo terapêutico', { x: pageMargin, y, size: 13, font: fontBold, color: rgb(0.12, 0.12, 0.12) })
      y -= 18
      for (const ln of wrapText(fontRegular, String(goal), 11.5, contentWidth)) {
        ensureRoom(16)
        page.drawText(ln, { x: pageMargin, y, size: 11.5, font: fontRegular, color: rgb(0.12, 0.12, 0.12) })
        y -= 14
      }
      y -= 8
    }

    // itens
    if (items.length) {
      ensureRoom(24)
      page.drawText('Itens prescritos', { x: pageMargin, y, size: 13, font: fontBold, color: rgb(0.12, 0.12, 0.12) })
      y -= 16
      let idx = 1
      for (const it of items) {
        const titleLine = `${idx}. ${it.name}${it.dose ? ` — ${it.dose}` : ''}`
        ensureRoom(20)
        page.drawText(titleLine, { x: pageMargin, y, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
        y -= 14

        const aux: string[] = []
        if (it.route) aux.push(`Via: ${it.route}`)
        if (it.frequency) aux.push(`Frequência: ${it.frequency}`)
        if (it.duration) aux.push(`Duração: ${it.duration}`)
        if (aux.length) {
          const s = aux.join('  •  ')
          for (const ln of wrapText(fontRegular, s, 11, contentWidth)) {
            ensureRoom(16)
            page.drawText(ln, { x: pageMargin + 14, y, size: 11, font: fontRegular, color: rgb(0.15, 0.15, 0.15) })
            y -= 13
          }
        }

        if (it.notes) {
          for (const ln of wrapText(fontRegular, `Obs.: ${it.notes}`, 11, contentWidth)) {
            ensureRoom(16)
            page.drawText(ln, { x: pageMargin + 14, y, size: 11, font: fontRegular, color: rgb(0.15, 0.15, 0.15) })
            y -= 13
          }
        }
        y -= 4
        idx++
      }
      y -= 4
    }

    // avisos/interações
    if (warnings.length) {
      ensureRoom(24)
      page.drawText('Interações e avisos', { x: pageMargin, y, size: 13, font: fontBold, color: rgb(0.12, 0.12, 0.12) })
      y -= 16
      for (const w of warnings) {
        const color =
          w.severity === 'contraindicated' ? rgb(0.80, 0.10, 0.10) :
          w.severity === 'major' ? rgb(0.82, 0.36, 0.08) :
          w.severity === 'moderate' ? rgb(0.50, 0.50, 0.05) :
          rgb(0.2, 0.2, 0.2)

        const line = `${w.pair} — ${w.severity.toUpperCase()}${w.note ? `: ${w.note}` : ''}`
        for (const ln of wrapText(fontRegular, line, 11, contentWidth)) {
          ensureRoom(16)
          page.drawText(ln, { x: pageMargin, y, size: 11, font: fontRegular, color })
          y -= 13
        }
      }
      y -= 6
    }

    // observações legais mínimas
    ensureRoom(40)
    page.drawLine({ start: { x: pageMargin, y }, end: { x: pageWidth - pageMargin, y }, thickness: 0.6, color: rgb(0.85, 0.85, 0.85) })
    y -= 14
    const legal = 'Orientações: Validade conforme normas locais. Este documento foi gerado eletronicamente e contém assinatura digital resumida para verificação.'
    for (const ln of wrapText(fontRegular, legal, 9.5, contentWidth)) {
      ensureRoom(14)
      page.drawText(ln, { x: pageMargin, y, size: 9.5, font: fontRegular, color: rgb(0.45, 0.45, 0.45) })
      y -= 12
    }

    // rodapé (todas as páginas)
    const pageCount = pdf.getPageCount()
    for (let i = 0; i < pageCount; i++) {
      const p = pdf.getPage(i)
      page = p
      const stamp = `Assinatura digital: ${hash}`
      const footerY = pageMargin - 26
      const pg = `pág. ${i + 1}/${pageCount}`
      page.drawText(stamp, { x: pageMargin, y: footerY, size: 9, font: fontRegular, color: rgb(0.45, 0.45, 0.45) })
      const w = fontRegular.widthOfTextAtSize(pg, 9)
      page.drawText(pg, { x: pageWidth - pageMargin - w, y: footerY, size: 9, font: fontRegular, color: rgb(0.45, 0.45, 0.45) })
    }

    const bytes = await pdf.save()

    // log opcional
    try {
      await prisma.generatedDoc.create({
        data: {
          userId: (req as any)?.session?.user?.id ?? 'system',
          kind: 'prescription',
          inputRef: encounterId || undefined,
          content: `pdf:${Buffer.from(bytes).toString('base64').slice(0, 100)}...`,
        },
      })
    } catch { /* noop */ }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="prescription.pdf"`)
    res.status(200).send(Buffer.from(bytes))
  } catch (e) {
    console.error('[pdf:prescription] error', e)
    res.status(500).json({ error: 'Falha ao gerar PDF' })
  }
}