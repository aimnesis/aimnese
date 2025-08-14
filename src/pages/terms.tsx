// src/pages/legal/terms.tsx
import Brand from '@/components/Brand'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <Brand />
      </header>

      <main className="container mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-4 text-3xl font-semibold">Termos de Uso</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Estes Termos de Uso regem o acesso e a utilização da plataforma Aimnesis.
          Ao utilizar nossos serviços, você concorda integralmente com estes termos.
        </p>

        <hr className="my-8 border-zinc-200 dark:border-zinc-800" />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">1. Uso permitido</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            O Aimnesis é destinado a profissionais de saúde. Você é responsável por manter
            a confidencialidade de suas credenciais e por todo uso realizado em sua conta.
          </p>

          <h2 className="text-xl font-semibold">2. Conteúdo e responsabilidade</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            As respostas fornecidas têm caráter informativo e não substituem julgamento clínico.
            Use a plataforma como apoio à decisão, seguindo boas práticas e normas vigentes.
          </p>

          <h2 className="text-xl font-semibold">3. Privacidade</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Tratamos seus dados conforme a nossa{' '}
            <a className="text-emerald-600 hover:underline" href="/legal/privacy">Política de Privacidade</a>.
          </p>
        </section>
      </main>
    </div>
  )
}