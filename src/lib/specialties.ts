// src/lib/specialties.ts
import specialties from '@/data/specialties.json'
import aliasMap from '@/data/specialty-aliases.json'

/** Retorna o nome oficial da especialidade, resolvendo sinônimos/abreviações. */
export function resolveSpecialty(input: string): string | null {
  if (!input) return null
  const q = input.trim().toLowerCase()

  // 1) Alias exato (case-insensitive)
  for (const [alias, canonical] of Object.entries(aliasMap)) {
    if (alias.toLowerCase() === q) return canonical
  }

  // 2) Match por início/substring no nome oficial
  const byPrefix = (specialties as string[]).find((s) =>
    s.toLowerCase().startsWith(q)
  )
  if (byPrefix) return byPrefix

  const bySubstring = (specialties as string[]).find((s) =>
    s.toLowerCase().includes(q)
  )
  if (bySubstring) return bySubstring

  return null
}