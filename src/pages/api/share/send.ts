// src/pages/api/share/send.ts
import type { NextApiRequest, NextApiResponse } from 'next'
// @ts-expect-error  // nodemailer may not have types installed in this repo
import nodemailer from 'nodemailer'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/server/auth'
import { rateLimit } from '@/lib/rateLimit'

// Aceita JSON; manter bodyParser ligado aqui
export const config = { api: { bodyParser: true } }

type AttachInput = {
  filename: string
  contentBase64: string   // base64 puro (sem data:)
  contentType?: string
}

type ApiOk = { ok: true; messageId: string; whatsappLink?: string }
type ApiErr = { ok: false; error: string }

function env(name: string, fallback = '') {
  return (process.env[name] ?? fallback).toString().trim()
}

function buildTransporter() {
  const host = env('SMTP_HOST')
  const port = Number(env('SMTP_PORT') || 587)
  const user = env('SMTP_USER')
  const pass = env('SMTP_PASS')
  const secure = env('SMTP_SECURE', '').toLowerCase() === 'true' || port === 465

  if (!host || !user || !pass) {
    throw new Error('SMTP não configurado (defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).')
  }

  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
}

function sanitizePhone(p?: string) {
  return (p || '').replace(/[^\d]/g, '')
}

function buildWaLink(phoneE164?: string, message?: string) {
  const text = encodeURIComponent(message || '')
  const phone = sanitizePhone(phoneE164)
  // se não vier número, usa formato que abre o app com seletor de contato
  return phone ? `https://wa.me/${phone}${text ? `?text=${text}` : ''}` : `https://wa.me/${text ? `?text=${text}` : ''}`
}

function absUrl(path: string) {
  const base = env('NEXT_PUBLIC_APP_URL', '').replace(/\/+$/, '')
  return base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : path
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>
) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' })
    return
  }

  // rate limit: 10/min por IP
  try {
    await rateLimit(req, res, { max: 10, windowMs: 60_000 })
  } catch {
    res.status(429).json({ ok: false, error: 'Muitas requisições, tente em instantes.' })
    return
  }

  // exige sessão
  const session = (await getServerSession(req as any, res as any, authOptions as any)) as any
  const s = session as any
  if (!s?.user?.id) {
    res.status(401).json({ ok: false, error: 'Não autenticado' })
    return
  }

  // parse seguro
  let body: any
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    res.status(400).json({ ok: false, error: 'JSON inválido' })
    return
  }

  // ─────────────────────────────────────────
  // MODO 1: formato clássico (to/subject/html|text)
  // ─────────────────────────────────────────
  const isClassic = !!body?.to && !!body?.subject && (body?.html || body?.text)
  if (isClassic) {
    try {
      const transporter = buildTransporter()
      const from = env('MAIL_FROM', 'Aimnesis <no-reply@aimnesis.app>')
      const attachments =
        (body.attachments || []).map((a: AttachInput) => ({
          filename: a.filename,
          content: Buffer.from(a.contentBase64, 'base64'),
          contentType: a.contentType || 'application/octet-stream',
        }))

      const info = await transporter.sendMail({
        from,
        to: body.to,
        cc: body.cc,
        bcc: body.bcc,
        subject: body.subject,
        html: body.html,
        text: body.text,
        attachments,
      })

      const whatsappLink = body.whatsapp ? buildWaLink(body.whatsapp.phoneE164, body.whatsapp.message) : undefined
      res.status(200).json({ ok: true, messageId: info.messageId, whatsappLink })
      return
    } catch (e: any) {
      const msg = e?.message || 'Falha ao enviar e-mail'
      console.error('[share/send] classic error:', msg)
      res.status(500).json({ ok: false, error: msg })
      return
    }
  }

  // ─────────────────────────────────────────
  // MODO 2: formato por encounterId/channels
  // ─────────────────────────────────────────
  if (body?.encounterId && Array.isArray(body?.channels)) {
    const encounterId = String(body.encounterId)
    const links = {
      clinical: absUrl(`/api/pdf/clinical-report?encounterId=${encodeURIComponent(encounterId)}`),
      rx: absUrl(`/api/pdf/prescription?encounterId=${encodeURIComponent(encounterId)}`),
    }
    let lastMessageId = 'n/a'
    let waLink: string | undefined

    try {
      const transporter = buildTransporter()
      const from = env('MAIL_FROM', 'Aimnesis <no-reply@aimnesis.app>')

      for (const ch of body.channels) {
        if (ch.type === 'email') {
          const to = ch.to || s?.user?.email
          const subject = ch.subject || `Documentos do encontro ${encounterId}`
          const html = `
            <div style="font:14px system-ui, -apple-system, Segoe UI, Roboto, Inter, sans-serif;color:#111">
              <p>Olá,</p>
              <p>Segue acesso rápido aos documentos do encontro <strong>${encounterId}</strong>:</p>
              <ul>
                <li><a href="${links.clinical}">Relatório clínico (PDF)</a></li>
                <li><a href="${links.rx}">Prescrição (PDF)</a></li>
              </ul>
              <p style="color:#666">Gerado com Aimnesis — apoio à decisão.</p>
            </div>
          `
          const info = await transporter.sendMail({ from, to, subject, html })
          lastMessageId = info.messageId
        } else if (ch.type === 'whatsapp') {
          const msg = ch.message || `Prescrição (PDF): ${links.rx}`
          waLink = buildWaLink(ch.phoneE164, msg)
          // nada a enviar do servidor; cliente abrirá o link
        }
      }

      res.status(200).json({ ok: true, messageId: lastMessageId, whatsappLink: waLink })
      return
    } catch (e: any) {
      const msg = e?.message || 'Falha ao processar compartilhamento'
      console.error('[share/send] encounter error:', msg)
      res.status(500).json({ ok: false, error: msg })
      return
    }
  }

  // formato inválido
  res.status(400).json({ ok: false, error: 'Campos obrigatórios ausentes.' })
}