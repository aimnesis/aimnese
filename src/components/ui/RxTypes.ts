// src/components/ui/RxTypes.ts
export type RxItem = {
  id: string
  name: string
  dose: string       // ex.: "500 mg"
  route: string      // ex.: "VO"
  frequency: string  // ex.: "8/8h"
  duration?: string  // ex.: "7 dias"
  notes?: string
}

export type PatientCtx = {
  age?: string
  weightKg?: string
  eGFR?: string      // TFG (mL/min)
  childPugh?: '' | 'A' | 'B' | 'C'
  allergies?: string
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}