// src/pages/api/health.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
}