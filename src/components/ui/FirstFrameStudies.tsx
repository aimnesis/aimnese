// src/components/ui/FirstFrameStudies.tsx
import React from 'react';
import { BookOpenCheck, ChevronRight } from 'lucide-react';

type Props = {
  suggestions?: string[];
  onSelectQuestion?: (q: string) => void;
};

export default function FirstFrameStudies({ suggestions = [], onSelectQuestion }: Props) {
  return (
    <section className="space-y-4">
      <header className="text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold flex items-center justify-center gap-2">
          <BookOpenCheck className="h-6 w-6 opacity-80" />
          Estudos & Diretrizes (GRÁTIS)
        </h2>
        <p className="text-muted mt-1 text-sm">
          Busque, sintetize e cite evidências (NEJM, JAMA, diretrizes brasileiras).
        </p>
        <div className="mt-2 text-[12.5px] text-muted">Hyperlinks para as fontes • Resumos práticos</div>
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
    </section>
  );
}