// src/pages/api/sentry-example-api.ts
import type { NextApiRequest, NextApiResponse } from 'next'

class SentryExampleAPIError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SentryExampleAPIError'
  }
}

// Rota apenas para testar o Sentry: acione com /api/sentry-example-api?test=1
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Usa os parâmetros para satisfazer o ESLint
  if (req.method === 'HEAD') {
    res.status(200).end()
    return
  }

  if (req.query?.test === '1') {
    throw new SentryExampleAPIError(
      'This error is raised on the backend called by the example page.'
    )
  }

  res.status(200).json({ ok: true })
}