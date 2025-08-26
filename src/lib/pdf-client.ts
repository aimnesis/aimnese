// src/lib/pdf-client.ts
/**
 * Utilitários para abrir/baixar PDFs gerados no servidor.
 * Funcionam em qualquer lugar do client (componentes React).
 */

export async function fetchPdfBlob(endpoint: string): Promise<Blob> {
  const r = await fetch(endpoint, { method: 'GET', headers: { Accept: 'application/pdf' } })
  if (!r.ok) {
    let msg = `Falha ao gerar PDF (HTTP ${r.status})`
    try {
      const j = await r.json()
      if (j?.error) msg = j.error
    } catch {}
    throw new Error(msg)
  }
  return await r.blob()
}

export async function openPdfInNewTab(endpoint: string) {
  const blob = await fetchPdfBlob(endpoint)
  const url = URL.createObjectURL(blob)
  // abre em nova aba; o navegador decidirá visualizar ou baixar
  window.open(url, '_blank', 'noopener,noreferrer')
  // opcional: liberar o blob após alguns segundos
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function downloadPdf(endpoint: string, filename = 'documento.pdf') {
  const blob = await fetchPdfBlob(endpoint)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/* Conveniências com encounterId */
export function openClinicalReport(encounterId: string) {
  return openPdfInNewTab(`/api/pdf/clinical-report?encounterId=${encodeURIComponent(encounterId)}`)
}
export function downloadClinicalReport(encounterId: string, filename = 'relatorio-clinico.pdf') {
  return downloadPdf(`/api/pdf/clinical-report?encounterId=${encodeURIComponent(encounterId)}`, filename)
}
export function openPrescription(encounterId: string) {
  return openPdfInNewTab(`/api/pdf/prescription?encounterId=${encodeURIComponent(encounterId)}`)
}
export function downloadPrescription(encounterId: string, filename = 'prescricao.pdf') {
  return downloadPdf(`/api/pdf/prescription?encounterId=${encodeURIComponent(encounterId)}`, filename)
}