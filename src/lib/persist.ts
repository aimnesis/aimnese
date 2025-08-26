type DraftReport = { sections: any[] }
type DraftRx = { items?: any[]; patient?: any; goal?: string }

const timers = new Map<string, number>()

function debounce(key: string, fn: () => void, ms = 500) {
  const prev = timers.get(key)
  if (prev) clearTimeout(prev)
  const t = window.setTimeout(fn, ms)
  timers.set(key, t)
}

/** Salva draft de relatório (se houver encounterId) */
export function saveReportDraft(encounterId: string | null | undefined, data: DraftReport) {
  if (!encounterId) return
  debounce(`report:${encounterId}`, () => {
    void fetch('/api/encounter/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encounterId, report: data }),
    })
  })
}

/** Salva draft de prescrição (se houver encounterId) */
export function saveRxDraft(encounterId: string | null | undefined, data: DraftRx) {
  if (!encounterId) return
  debounce(`rx:${encounterId}`, () => {
    void fetch('/api/encounter/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encounterId, rx: data }),
    })
  })
}