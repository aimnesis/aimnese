import type { NextApiRequest, NextApiResponse } from 'next'
import PDFDocument from 'pdfkit'

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const doc = new PDFDocument({ size: 'A4', margin: 42 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline; filename="Aimnesis-WhiteLabel.pdf"')
  doc.pipe(res)

  doc.fontSize(22).text('Aimnesis — White-label para Clínicas', { align: 'left' }).moveDown(0.6)
  doc.fontSize(12).fillColor('#444').text('Copiloto clínico, relatórios e prescrição com sua marca e domínio.', { align: 'left' })
  doc.moveDown(1)

  const bullets = [
    'Domínio e marca próprios (logo, cores, subdomínio/domínio).',
    'Relatórios SOAP e Prescrição com checagem de interações.',
    'LGPD por padrão: criptografia, logs e retenção configurável.',
    'Onboarding em horas, não meses.',
  ]
  doc.fillColor('#000')
  bullets.forEach((b) => {
    doc.circle(50, doc.y + 6, 2).fill('#000')
    doc.fillColor('#000').text('  ' + b, 56, doc.y - 8)
    doc.moveDown(0.5)
  })

  doc.moveDown(1.2).fillColor('#000').fontSize(14).text('Contato', { underline: true })
  doc.fontSize(12).fillColor('#333').text('parceiros@aimnesis.com')
  doc.end()
}