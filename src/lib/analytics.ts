// src/lib/analytics.ts
export type TrackFn = (event: string, props?: Record<string, any>) => void

let track: TrackFn = () => {}
declare global { interface Window { posthog?: any } }

try {
  if (typeof window !== 'undefined' && (window as any).posthog?.capture) {
    track = (evt, props) => (window as any).posthog.capture(evt, props)
  }
} catch {
  // no-op
}

export const analytics = { track }