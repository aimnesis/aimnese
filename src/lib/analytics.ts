// src/lib/analytics.ts
import posthog from 'posthog-js'

let inited = false

export function initAnalytics() {
  if (typeof window === 'undefined' || inited) return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'
  if (!key) return
  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    capture_pageleave: true,
    // Respeito a privacidade (ajuste conforme política):
    disable_session_recording: true,
  })
  inited = true
}

export function track(event: string, props?: Record<string, any>) {
  try { posthog.capture(event, props) } catch {}
}

export function identify(userId?: string | null, props?: Record<string, any>) {
  try {
    if (userId) posthog.identify(userId, props)
  } catch {}
}