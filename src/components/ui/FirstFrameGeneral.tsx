// src/components/ui/FirstFrameGeneral.tsx
import React from 'react';
import { Stethoscope, ChevronRight } from 'lucide-react';

type Props = {
  suggestions?: string[];
  onSelectQuestion?: (q: string) => void;
};

export default function FirstFrameGeneral({ suggestions = [], onSelectQuestion }: Props) {
  return (
    <section className="space-y-4">
      <header className="text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold flex items-center justify-center gap-2">
          <Stethoscope className="h-6 w-6 opacity-80" />
          Copiloto Médico — Geral (GRÁTIS)
        </h2>
        <p className="text-muted mt-1 text-sm">
          Respostas clínicas claras com referências. Em português. Sem alucinação deliberada.
        </p>
        <div className="mt-2 text-[12.5px] text-muted">
          Evidência típica &gt; 92% • LGPD • Sem PII do paciente
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {suggestions.slice(0, 4).map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelectQuestion?.(s)}
            className="w-full rounded-xl border border-base bg-panel px-4 py-3 text-left hover:bg-panel-2 transition flex items-center justify-between gap-2"
            title={s}
          >
            <span className="truncate">{s}</span>
            <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
          </button>
        ))}
      </div>

      <article className="rounded-xl border border-base bg-panel p-4">
        <h3 className="font-semibold mb-2">Como usar (3 passos)</h3>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>Descreva o caso (idade, queixa, duração, sinais e exames).</li>
          <li>Peça raciocínio: diferenciais, exames pertinentes e condutas.</li>
          <li>Confira as referências e adapte ao seu contexto clínico.</li>
        </ol>
      </article>

      <p className="text-[12px] text-muted text-center">
        Dica: pressione <kbd>/</kbd> para focar o campo de pergunta.
      </p>
    </section>
  );
}