// src/components/ui/CopilotPromptBuilder.tsx
'use client'

import { useMemo, useState } from 'react'

type Fields = {
  subjetivo: string
  objetivo: string
  avaliacao: string
  plano: string
  hipoteses: string
  ddx: string
  exames: string
  tratamento: string
  altaRetorno: string
  comorbidades: string
  alergias: string
  medsEmUso: string
  observacoes: string
  transcricao?: string
}

type Props = {
  onBuild: (prompt: string) => void
  onChange?: (f: Partial<Fields>) => void
  initial?: Partial<Fields>
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <label className="block">
      <div className="text-[13px] font-medium mb-1">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-base bg-panel px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent resize-y"
      />
    </label>
  )
}

export default function CopilotPromptBuilder({ onBuild, onChange, initial }: Props) {
  const [f, setF] = useState<Fields>({
    subjetivo: '',
    objetivo: '',
    avaliacao: '',
    plano: '',
    hipoteses: '',
    ddx: '',
    exames: '',
    tratamento: '',
    altaRetorno: '',
    comorbidades: '',
    alergias: '',
    medsEmUso: '',
    observacoes: '',
    transcricao: '',
    ...initial,
  })

  function upd<K extends keyof Fields>(k: K, v: Fields[K]) {
    const next = { ...f, [k]: v }
    setF(next)
    onChange?.({ [k]: v })
  }

  const prompt = useMemo(() => {
    const blocos: string[] = []
    if (f.transcricao?.trim()) blocos.push(`TRANSCRIÇÃO DA CONSULTA (texto livre):\n${f.transcricao.trim()}`)
    if (f.subjetivo.trim()) blocos.push(`S (Subjetivo):\n${f.subjetivo.trim()}`)
    if (f.objetivo.trim()) blocos.push(`O (Objetivo | achados/vitais/exame físico):\n${f.objetivo.trim()}`)
    if (f.avaliacao.trim()) blocos.push(`A (Avaliação):\n${f.avaliacao.trim()}`)
    if (f.plano.trim()) blocos.push(`P (Plano inicial):\n${f.plano.trim()}`)
    if (f.hipoteses.trim()) blocos.push(`Hipóteses diagnósticas:\n${f.hipoteses.trim()}`)
    if (f.ddx.trim()) blocos.push(`Diagnóstico diferencial:\n${f.ddx.trim()}`)
    if (f.exames.trim()) blocos.push(`Exames/propedêutica sugerida:\n${f.exames.trim()}`)
    if (f.tratamento.trim()) blocos.push(`Tratamento proposto:\n${f.tratamento.trim()}`)
    if (f.altaRetorno.trim()) blocos.push(`Alta & Retorno:\n${f.altaRetorno.trim()}`)
    if (f.comorbidades.trim()) blocos.push(`Comorbidades relevantes:\n${f.comorbidades.trim()}`)
    if (f.alergias.trim()) blocos.push(`Alergias/contraindicações:\n${f.alergias.trim()}`)
    if (f.medsEmUso.trim()) blocos.push(`Medicamentos em uso:\n${f.medsEmUso.trim()}`)
    if (f.observacoes.trim()) blocos.push(`Observações adicionais:\n${f.observacoes.trim()}`)

    const instrucoes =
`Você é um copiloto clínico para médicos. Gere um RELATÓRIO CLÍNICO estruturado, claro e objetivo com:

• Resumo do caso (SOPA).
• Lista de hipóteses e DDx com probabilidades relativas quando possível.
• Propedêutica: exames que ajudam a confirmar/afastar hipóteses, com justificativa.
• Conduta inicial e tratamento (doses, intervalos, ajustes renais/hepáticos).
• Critérios de gravidade, sinais de alarme e quando internar/encaminhar.
• Plano de alta e seguimento.
• Referências baseadas em diretrizes recentes (cite em formato curto).

Formate com títulos, bullets e, quando for medicamento, use tabela com Dose | Via | Frequência | Observações. Responda em português do Brasil, conciso e técnico.`

    return `${instrucoes}\n\n=== DADOS DO CASO ===\n${blocos.join('\n\n')}`.trim()
  }, [f])

  return (
    <section className="rounded-2xl border border-base bg-panel shadow-soft p-4 sm:p-5 space-y-3">
      <header className="mb-1">
        <h3 className="text-base font-semibold">Relatório estruturado (SOPA + conduta)</h3>
        <p className="text-[12.5px] text-muted">Preencha o que tiver. Você pode colar a transcrição da consulta no campo abaixo; depois edite os blocos relevantes.</p>
      </header>

      <TextArea label="Transcrição (opcional — colar aqui)" value={f.transcricao || ''} onChange={(v) => upd('transcricao', v)} rows={5} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextArea label="S — Subjetivo" value={f.subjetivo} onChange={(v) => upd('subjetivo', v)} />
        <TextArea label="O — Objetivo (sinais vitais/exame)" value={f.objetivo} onChange={(v) => upd('objetivo', v)} />
        <TextArea label="A — Avaliação" value={f.avaliacao} onChange={(v) => upd('avaliacao', v)} />
        <TextArea label="P — Plano inicial" value={f.plano} onChange={(v) => upd('plano', v)} />
        <TextArea label="Hipóteses diagnósticas" value={f.hipoteses} onChange={(v) => upd('hipoteses', v)} />
        <TextArea label="Diagnóstico diferencial (DDx)" value={f.ddx} onChange={(v) => upd('ddx', v)} />
        <TextArea label="Exames/propedêutica" value={f.exames} onChange={(v) => upd('exames', v)} />
        <TextArea label="Tratamento" value={f.tratamento} onChange={(v) => upd('tratamento', v)} />
        <TextArea label="Alta & retorno" value={f.altaRetorno} onChange={(v) => upd('altaRetorno', v)} />
        <TextArea label="Comorbidades" value={f.comorbidades} onChange={(v) => upd('comorbidades', v)} />
        <TextArea label="Alergias/contraindicações" value={f.alergias} onChange={(v) => upd('alergias', v)} />
        <TextArea label="Medicamentos em uso" value={f.medsEmUso} onChange={(v) => upd('medsEmUso', v)} />
      </div>
      <TextArea label="Observações adicionais" value={f.observacoes} onChange={(v) => upd('observacoes', v)} />

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={() => onBuild(prompt)}
          className="rounded-lg border border-base bg-panel px-4 py-2 text-sm hover:bg-panel-2 transition"
        >
          Gerar relatório
        </button>
      </div>
    </section>
  )
}