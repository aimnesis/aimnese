// src/pages/legal/privacy.tsx
import Brand from '@/components/Brand'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <Brand />
      </header>

      <main className="container mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-4 text-3xl font-semibold">Política de Privacidade</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Esta Política descreve como coletamos, usamos e protegemos suas informações pessoais
          no Aimnesis.
        </p>

        <hr className="my-8 border-zinc-200 dark:border-zinc-800" />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">1. Dados coletados</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Coletamos dados de cadastro (nome, e-mail, CRM/UF, especialidade, contatos)
            e dados de uso para melhorar a experiência e garantir segurança.
          </p>

          <h2 className="text-xl font-semibold">2. Finalidade</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Utilizamos os dados para autenticação, personalização da experiência e
            melhoria contínua dos nossos serviços.
          </p>

          <h2 className="text-xl font-semibold">3. Direitos</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Você pode solicitar acesso, correção ou exclusão dos seus dados conforme a legislação aplicável.
          </p>
        </section>
      </main>
    </div>
  )
}