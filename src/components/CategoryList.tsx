// src/components/CategoryList.tsx
'use client'

import React, { useMemo, FC } from 'react'
import Link from 'next/link'

interface CategoryItem {
  question: string
  label: string
}

interface CategoryProps {
  title: string
  items: CategoryItem[]
}

const Category: FC<CategoryProps> = ({ title, items }) => (
  <div className="category p-4 bg-zinc-900 rounded-md shadow" aria-label={title}>
    <h4 className="text-md font-semibold text-white mb-2">{title}</h4>
    {items.length > 0 ? (
      <ul className="list-none space-y-1">
        {items.map(({ question, label }) => (
          <li key={question}>
            <Link
              href={`/ask/${encodeURIComponent(question)}`}
              aria-label={label}
              className="text-sm text-orange-400 hover:underline"
              role="link"
              prefetch={false}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-xs text-zinc-500">Nenhum item disponível.</p>
    )}
  </div>
)

const CategoryList: FC = () => {
  const categories = useMemo<CategoryProps[]>(
    () => [
      {
        title: 'Efeitos colaterais de medicamentos',
        items: [
          {
            question: 'efeitos-colaterais-comuns-metformina',
            label: 'Quais são os efeitos colaterais mais comuns da metformina?',
          },
          {
            question: 'efeitos-graves-lisinopril-longo-prazo',
            label: 'Existem riscos de efeitos colaterais graves com uso prolongado de lisinopril?',
          },
          {
            question: 'efeitos-colaterais-apixaban-idosos',
            label: 'Quais são os efeitos colaterais conhecidos do apixabana em pacientes idosos ou com função renal reduzida?',
          },
        ],
      },
      {
        title: 'Diretrizes',
        items: [
          {
            question: 'recomendacoes-idsa-infeccoes-pseudomonas',
            label: 'Recomendações da IDSA para tratar Pseudomonas multirresistente',
          },
          {
            question: 'diretrizes-aha-acc-hipertensao-doenca-renal-cronica',
            label: 'Diretrizes AHA/ACC para hipertensão em doença renal crônica',
          },
          {
            question: 'atualizacoes-ada-2024',
            label: 'O que foi atualizado nas diretrizes da ADA 2024?',
          },
        ],
      },
      {
        title: 'Exames a considerar',
        items: [
          {
            question: 'exames-insuficiencia-cardiaca-aguda',
            label: 'Quais exames solicitar em exacerbação aguda de insuficiência cardíaca?',
          },
          {
            question: 'exames-fraqueza-generalizada',
            label: 'Exames em fraqueza generalizada',
          },
          {
            question: 'exames-amlodipino',
            label: 'Exames importantes para pacientes em uso de amlodipino',
          },
        ],
      },
      {
        title: 'Opções de tratamento',
        items: [
          {
            question: 'opcoes-tratamento-insuficiencia-cardiaca-fraxa',
            label: 'Opções de tratamento para insuficiência cardíaca com fração de ejeção reduzida',
          },
          {
            question: 'terapia-cancer-pulmao-nao-pequenas-celulas-estagio-iv',
            label: 'Terapia recomendada para câncer de pulmão não pequenas células estágio IV',
          },
          {
            question: 'recorrencia-clostridioides-difficile',
            label: 'Tratamento para recorrência de C. difficile após múltiplas falhas de antibióticos',
          },
        ],
      },
    ],
    []
  )

  if (categories.length === 0) {
    return (
      <section className="categories py-6">
        <h3 className="text-lg font-semibold text-white mb-4">Explore mais funcionalidades</h3>
        <p className="text-sm text-zinc-500">Nenhuma categoria disponível.</p>
      </section>
    )
  }

  return (
    <section
      className="categories py-6"
      aria-label="Acesso rápido a categorias comuns de perguntas"
    >
      <h3 className="text-lg font-semibold text-white mb-4">Explore mais funcionalidades</h3>
      <div className="category-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((cat) => (
          <Category key={cat.title} {...cat} />
        ))}
      </div>
    </section>
  )
}

export default React.memo(CategoryList)