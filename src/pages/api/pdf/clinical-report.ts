// src/pages/api/pdf/clinical-report.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } },
}

type Section = { title: string; content: string }
type Doctor = { name?: string; crm?: string; uf?: string; city?: string; state?: string }
type Patient = { name?: string; id?: string; header?: string }
type Body = {
  title?: string
  doctor?: Doctor
  patient?: Patient
  sections: Section[]
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
      // se a palavra isolada for maior que a largura, quebramos por caracteres
      if (font.widthOfTextAtSize(w, size) > maxWidth) {
        let chunk = ''
        for (const ch of w) {
          const test = chunk + ch
          if (font.widthOfTextAtSize(test, size) <= maxWidth) chunk = test
          else { if (chunk) lines.push(chunk); chunk = ch }
        }
        if (chunk) { line = chunk }
        else { line = '' }
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
    title = 'Relatório clínico',
    doctor = {},
    patient = {},
    sections = [],
    encounterId,
  } = body

  try {
    const pdf = await PDFDocument.create()
    const pageMargin = 56 // px
    const pageWidth = 595.28 // A4 width
    const pageHeight = 841.89 // A4 height
    const contentWidth = pageWidth - pageMargin * 2

    const fontRegular = await pdf.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)

    let page = pdf.addPage([pageWidth, pageHeight])
    let y = pageHeight - pageMargin

    const drawHeader = () => {
      const head = title
      const doctorLine = [
        doctor.name || '',
        doctor.crm ? `CRM ${doctor.crm}${doctor.uf ? '/' + doctor.uf : ''}` : '',
        doctor.city || doctor.state ? `• ${[doctor.city, doctor.state].filter(Boolean).join(' / ')}` : '',
      ].filter(Boolean).join('  ')
      const patientLine = patient.name || patient.id || patient.header
        ? [patient.name, patient.id, patient.header].filter(Boolean).join(' — ')
        : undefined

      page.drawText(head, { x: pageMargin, y: y - 2, size: 18, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
      y -= 24

      if (doctorLine) {
        page.drawText(doctorLine, { x: pageMargin, y, size: 10.5, font: fontRegular, color: rgb(0.32, 0.32, 0.32) })
        y -= 16
      }
      if (patientLine) {
        page.drawText(patientLine, { x: pageMargin, y, size: 10.5, font: fontRegular, color: rgb(0.32, 0.32, 0.32) })
        y -= 18
      }
      // linha
      page.drawLine({ start: { x: pageMargin, y }, end: { x: pageWidth - pageMargin, y }, thickness: 0.7, color: rgb(0.8, 0.8, 0.8) })
      y -= 16
    }

    const drawFooter = (pageIndex: number, pageCount: number, hash: string) => {
      const footerY = pageMargin - 26
      const stamp = `Assinatura digital: ${hash}`
      const pg = `pág. ${pageIndex + 1}/${pageCount}`
      page.drawText(stamp, { x: pageMargin, y: footerY, size: 9, font: fontRegular, color: rgb(0.45, 0.45, 0.45) })
      const w = fontRegular.widthOfTextAtSize(pg, 9)
      page.drawText(pg, { x: pageWidth - pageMargin - w, y: footerY, size: 9, font: fontRegular, color: rgb(0.45, 0.45, 0.45) })
    }

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ title, doctor, patient, sections, encounterId }) + Date.now())
      .digest('hex')
      .slice(0, 16)

    const ensureRoom = (need: number) => {
      if (y - need < pageMargin + 40) {
        page = pdf.addPage([pageWidth, pageHeight])
        y = pageHeight - pageMargin
        drawHeader()
      }
    }

    // primeira página: cabeçalho
    drawHeader()

    // conteúdo
    const titleSize = 13
    const textSize = 11.5
    for (const sec of sections) {
      const stitle = String(sec.title || '').trim()
      const sbody = String(sec.content || '').trim() || '—'

      // título
      ensureRoom(28)
      page.drawText(stitle, { x: pageMargin, y, size: titleSize, font: fontBold, color: rgb(0.12, 0.12, 0.12) })
      y -= 18

      // corpo (wrap)
      const lines = wrapText(fontRegular, sbody, textSize, contentWidth)
      for (const ln of lines) {
        ensureRoom(16)
        page.drawText(ln, { x: pageMargin, y, size: textSize, font: fontRegular, color: rgb(0.12, 0.12, 0.12) })
        y -= 14
      }
      y -= 8
    }

    // adiciona rodapé numérico em todas as páginas
    const pageCount = pdf.getPageCount()
    for (let i = 0; i < pageCount; i++) {
      const p = pdf.getPage(i)
      page = p
      drawFooter(i, pageCount, hash)
    }

    const bytes = await pdf.save()

    // tentativa de log (não obrigatório)
    try {
      await prisma.generatedDoc.create({
        data: {
          userId: (req as any)?.session?.user?.id ?? 'system',
          kind: 'clinical-report',
          inputRef: encounterId || undefined,
          content: `pdf:${Buffer.from(bytes).toString('base64').slice(0, 100)}...`, // armazenar só um prefixo
        },
      })
    } catch { /* noop */ }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="clinical-report.pdf"`)
    res.status(200).send(Buffer.from(bytes))
  } catch (e) {
    console.error('[pdf:clinical-report] error', e)
    res.status(500).json({ error: 'Falha ao gerar PDF' })
  }
}