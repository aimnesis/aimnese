// src/lib/rx-rules.ts
/* Regras iniciais para sugestões de dose/ajuste e checagem de interações.
   Foco em segurança: ajustes renais/hepáticos, flags e notas claras. */

export type PatientMeta = {
  age?: number
  weightKg?: number
  eGFR?: number // mL/min/1.73m2
  childPugh?: string // 'A'|'B'|'C' ou string livre
  pregnant?: boolean
  lactating?: boolean
  allergies?: string
}

export type SuggestItem = {
  name: string
  dose?: string
  route?: string
  frequency?: string
  duration?: string
}

export type SuggestResult = {
  item: SuggestItem
  notes: string[]
  flags: Array<'renal' | 'hepatic' | 'pregnancy' | 'lactation' | 'warning'>
}

/* --------------------------------- utils --------------------------------- */

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const alias: Record<string, string> = {
  'amox': 'amoxicilina',
  'amoxicillin': 'amoxicilina',
  'azitro': 'azitromicina',
  'ceftriaxone': 'ceftriaxona',
  'metamizol': 'dipirona',
  'diclofenaco': 'ibuprofeno', // aproximação NSAID
  'losartan': 'losartana',
  'hctz': 'hidroclorotiazida',
  'hydrochlorothiazide': 'hidroclorotiazida',
  'acetaminofen': 'paracetamol',
  'warfarin': 'varfarina',
  'warfarina': 'varfarina',
  'tmp smx': 'sulfametoxazol + trimetoprim',
  'tmp/smx': 'sulfametoxazol + trimetoprim',
  'tmp-smx': 'sulfametoxazol + trimetoprim',
  'co-trimoxazol': 'sulfametoxazol + trimetoprim',
  'rivaro': 'rivaroxabana',
}

export function normalizeDrugName(raw: string): string {
  const n = norm(raw)
  if (alias[n]) return alias[n]
  // mapeia direto se já estiver no formato alvo
  return n
}

/* ---------------------------- SUGESTÃO DE DOSE --------------------------- */

export function suggest(drugRaw: string, p: PatientMeta = {}): SuggestResult {
  const name = title(normalizeDrugName(drugRaw))
  const eGFR = Number.isFinite(p.eGFR as number) ? (p.eGFR as number) : undefined
  const child = (p.childPugh || '').toUpperCase()
  const pregnant = !!p.pregnant
  const lactating = !!p.lactating

  const item: SuggestItem = { name }
  const notes: string[] = []
  const flags: SuggestResult['flags'] = []

  // helpers
  const renal = (n: string) => { flags.push('renal'); notes.push(n) }
  const hepatic = (n: string) => { flags.push('hepatic'); notes.push(n) }
  const preg = (n: string) => { flags.push('pregnancy'); notes.push(n) }
  const lact = (n: string) => { flags.push('lactation'); notes.push(n) }
  const warn = (n: string) => { flags.push('warning'); notes.push(n) }

  switch (norm(name)) {
    case 'amoxicilina': {
      item.route = 'VO'
      item.dose = '500 mg'
      item.frequency = eGFR !== undefined && eGFR < 10 ? '1x/dia' :
                       eGFR !== undefined && eGFR < 30 ? '12/12h' : '8/8h'
      item.duration = '7–10 dias'
      if (eGFR !== undefined && eGFR < 30) renal('Ajuste renal: reduzir frequência (eGFR <30).')
      break
    }

    case 'azitromicina': {
      item.route = 'VO'
      item.dose = '500 mg'
      item.frequency = '1x/dia'
      item.duration = '3–5 dias'
      // QT prolongado — cuidado com antieméticos/antiarrítmicos
      warn('Risco de prolongamento de QT; evitar combinar com fármacos que também prolongam QT.')
      break
    }

    case 'ceftriaxona': {
      item.route = 'IV'
      item.dose = '1 g'
      item.frequency = '1x/dia'
      item.duration = '7 dias'
      hepatic('Ajuste/monitorar em colestase importante; atenção em Child-Pugh C.')
      notes.push('Evitar em recém-nascidos por risco de kernicterus.')
      break
    }

    case 'dipirona': {
      item.route = 'VO'
      item.dose = '500 mg'
      item.frequency = '6/6h se dor'
      notes.push('Risco raro de agranulocitose; orientar sinais de alarme.')
      break
    }

    case 'ibuprofeno': {
      item.route = 'VO'
      item.dose = '400 mg'
      item.frequency = '8/8h se dor'
      if (eGFR !== undefined && eGFR < 30) warn('Evitar AINE em TFG <30 mL/min (risco de lesão renal).')
      break
    }

    case 'enalapril': {
      item.route = 'VO'
      item.dose = eGFR !== undefined && eGFR < 30 ? '2,5 mg' : '5 mg'
      item.frequency = '12/12h'
      if (eGFR !== undefined && eGFR < 30) renal('Iniciar com dose menor em TFG <30.')
      warn('Checar K+ e creatinina 1–2 semanas após início/ajuste.')
      if (pregnant) preg('Contraindicado na gestação (IECA).')
      break
    }

    case 'losartana': {
      item.route = 'VO'
      item.dose = '50 mg'
      item.frequency = '1x/dia'
      warn('Monitorar K+ e função renal.')
      if (pregnant) preg('Contraindicado na gestação (BRA).')
      break
    }

    case 'hidroclorotiazida': {
      item.route = 'VO'
      item.dose = '25 mg'
      item.frequency = '1x/dia'
      if (eGFR !== undefined && eGFR < 30) renal('Baixa eficácia em TFG <30; considerar diurético de alça.')
      break
    }

    case 'metformina': {
      item.route = 'VO'
      item.dose = '500 mg'
      item.frequency = '2x/dia'
      if (eGFR !== undefined && eGFR < 30) {
        renal('Contraindicado se TFG <30 (risco de acidose láctica).')
        warn('Evitar — TFG <30.')
      } else if (eGFR !== undefined && eGFR < 45) {
        renal('Reduzir dose com TFG 30–44; reavaliar risco/benefício.')
      }
      hepatic('Cautela em doença hepática descompensada.')
      break
    }

    case 'insulina nph': {
      item.route = 'SC'
      item.dose = '0,2–0,3 U/kg/dia'
      item.frequency = '1–2x/dia'
      notes.push('Ajustar titulação conforme glicemias.')
      break
    }

    case 'omeprazol': {
      item.route = 'VO'
      item.dose = '20 mg'
      item.frequency = '1x/dia'
      item.duration = '4–8 semanas'
      break
    }

    case 'ondansetrona': {
      item.route = 'VO'
      item.dose = '4 mg'
      item.frequency = '8/8h se necessário'
      if (child === 'C') hepatic('Child-Pugh C: reduzir dose/frequência.')
      warn('Risco de prolongamento de QT; evitar combinações pró-arrítmicas.')
      break
    }

    case 'paracetamol': {
      item.route = 'VO'
      item.dose = '500 mg'
      item.frequency = '6/6h (máx. 3 g/dia)'
      hepatic('Cautela em doença hepática; reduzir dose máxima diária.')
      break
    }

    case 'rivaroxabana': {
      item.route = 'VO'
      item.dose = eGFR !== undefined && eGFR >= 15 && eGFR < 50 ? '15 mg' : '20 mg'
      item.frequency = '1x/dia'
      if (eGFR !== undefined && eGFR < 15) renal('Evitar se TFG <15 (contraindicado).')
      warn('Avaliar risco de sangramento; evitar combinações com AINE sem proteção.')
      if (pregnant) preg('Evitar na gestação (dados limitados).')
      break
    }

    case 'sulfametoxazol + trimetoprim': {
      item.route = 'VO'
      item.dose = '160/800 mg'
      item.frequency = '12/12h'
      if (eGFR !== undefined && eGFR < 30) renal('Ajuste de intervalo com TFG <30.')
      warn('Risco de hiperK+ ao combinar com IECA/BRA; interação importante com varfarina.')
      break
    }

    default: {
      // Sem regra específica — devolve casca para edição
      item.route = ''
      item.dose = ''
      item.frequency = ''
      item.duration = ''
      notes.push('Sem protocolo automatizado — revisar manualmente.')
    }
  }

  if (lactating) {
    // regra leve: lembrete geral
    lact('Avaliar compatibilidade com lactação quando aplicável.')
  }

  return { item, notes, flags }
}

function title(s: string) {
  return s.replace(/\b(\p{L})(\p{L}*)/gu, (_, a, b) => a.toUpperCase() + String(b))
}

/* ------------------------- INTERAÇÕES MEDICAMENTOSAS ------------------------- */

export type InteractionWarning = {
  pair: string // "A + B"
  severity: 'contraindicado' | 'major' | 'moderate' | 'minor'
  note: string
}

type DrugTag =
  | 'ACEI' | 'ARB' | 'NSAID' | 'THIAZIDE' | 'QT' | 'MACROLIDE'
  | 'ANTICOAG_XA' | 'SULFA' | 'PARACETAMOL' | 'WARFARIN'

function tags(drug: string): DrugTag[] {
  const d = norm(drug)
  if (d === 'enalapril') return ['ACEI']
  if (d === 'losartana') return ['ARB']
  if (d === 'ibuprofeno' || d === 'dipirona') return ['NSAID']
  if (d === 'hidroclorotiazida') return ['THIAZIDE']
  if (d === 'azitromicina') return ['MACROLIDE', 'QT']
  if (d === 'ondansetrona') return ['QT']
  if (d === 'rivaroxabana') return ['ANTICOAG_XA']
  if (d === 'sulfametoxazol + trimetoprim') return ['SULFA']
  if (d === 'paracetamol') return ['PARACETAMOL']
  if (d === 'varfarina') return ['WARFARIN']
  return []
}

export function checkInteractions(drugsRaw: string[]): InteractionWarning[] {
  const d = Array.from(new Set(drugsRaw.map(normalizeDrugName)))
  const w: InteractionWarning[] = []

  const has = (tag: DrugTag) => d.some((name) => tags(name).includes(tag))

  // 1) IECA + BRA → evitar combinação rotineira (hipercalemia/IRA)
  if (has('ACEI') && has('ARB')) {
    w.push({
      pair: 'IECA + BRA',
      severity: 'major',
      note: 'Evitar combinação de IECA (ex.: enalapril) com BRA (ex.: losartana): ↑hipercalemia/IRA sem benefício claro.',
    })
  }

  // 2) Anticoagulante fator Xa + AINE → ↑sangramento
  if (has('ANTICOAG_XA') && has('NSAID')) {
    w.push({
      pair: 'Anticoagulante Xa + AINE',
      severity: 'major',
      note: 'AINEs aumentam o risco de sangramento com rivaroxabana. Considere alternativa analgésica ou gastroproteção.',
    })
  }

  // 3) Macrolídeo + QT (ondansetrona) → prolongamento de QT
  if (has('MACROLIDE') && has('QT')) {
    w.push({
      pair: 'Macrolídeo + pró-QT',
      severity: 'major',
      note: 'Risco de prolongamento de QT/TdP. Evitar associação de azitromicina com fármacos pró-arrítmicos (ex.: ondansetrona).',
    })
  }

  // 4) Sulfa (TMP-SMX) + IECA/BRA → hiperK+
  if (has('SULFA') && (has('ACEI') || has('ARB'))) {
    w.push({
      pair: 'TMP-SMX + IECA/BRA',
      severity: 'major',
      note: 'Risco de hipercalemia. Monitorar K+ e considerar alternativa.',
    })
  }

  // 5) Varfarina + TMP-SMX → ↑INR (se entrar no sistema)
  if (has('WARFARIN') && has('SULFA')) {
    w.push({
      pair: 'Varfarina + TMP-SMX',
      severity: 'major',
      note: 'Potente aumento de INR/risco hemorrágico. Evitar associação ou ajustar com monitorização próxima.',
    })
  }

  // 6) “Triple whammy”: IECA/BRA + diurético tiazídico + AINE → IRA
  if ((has('ACEI') || has('ARB')) && has('THIAZIDE') && has('NSAID')) {
    w.push({
      pair: 'IECA/BRA + tiazídico + AINE',
      severity: 'major',
      note: 'Risco de lesão renal aguda (triple whammy). Evitar AINE ou monitorar função renal/PA de perto.',
    })
  }

  // 7) Paracetamol + Varfarina (uso crônico) — moderada
  if (has('PARACETAMOL') && has('WARFARIN')) {
    w.push({
      pair: 'Paracetamol + Varfarina',
      severity: 'moderate',
      note: 'Uso regular de paracetamol pode aumentar INR; monitorar mais de perto.',
    })
  }

  return w
}