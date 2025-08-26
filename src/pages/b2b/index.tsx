// src/pages/b2b/index.tsx
import Head from 'next/head'
import Link from 'next/link'
import Layout from '@/components/Layout'

export default function B2B() {
  return (
    <Layout title="B2B — White-label para Clínicas" description="Copiloto clínico, relatórios e prescrição com sua marca e domínio.">
      <Head>
        <meta name="robots" content="index,follow" />
      </Head>

      <main className="min-h-[100dvh] bg-app">
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
          <header className="max-w-3xl">
            <h1 className="text-[clamp(28px,4vw,40px)] font-semibold tracking-tight">
              White-label para clínicas: lance sua plataforma médica com sua marca
            </h1>
            <p className="mt-3 text-[15.5px] text-muted leading-relaxed">
              Domínio próprio, logo e cores. Relatórios SOAP e Prescrição com checagem de interações.
              LGPD por padrão. Onboarding em horas, não meses.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/parceiros" className="btn rounded-full h-11 px-6 shadow-soft focus-visible:ring-2">
                Tornar-se parceiro
              </Link>
              <Link href="/pricing" className="rounded-full h-11 px-6 inline-grid place-items-center border border-base bg-panel hover:bg-panel/80">
                Planos e preços
              </Link>
            </div>
          </header>

          <div className="mt-10 grid gap-4 sm:gap-5 md:grid-cols-3">
            {[
              ['Marca e domínio', 'Logo, cores e subdomínio/domínio próprio.'],
              ['Relatórios e Rx', 'SOAP, orientações e prescrição em PDF com auditoria.'],
              ['LGPD por padrão', 'Criptografia, logs e retenção configurável.'],
            ].map(([t, d]) => (
              <article key={t} className="rounded-2xl border border-base bg-panel p-5 hover:-translate-y-[2px] hover:shadow-soft transition">
                <h3 className="text-[17px] font-semibold tracking-tight">{t}</h3>
                <p className="mt-2 text-[14.5px] text-muted leading-snug">{d}</p>
              </article>
            ))}
          </div>

          <section className="mt-12">
            <h2 className="text-[22px] font-semibold tracking-tight">Como funciona</h2>
            <ol className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                ['1. Configure', 'Escolha domínio, logo e cores.'],
                ['2. Ative', 'Conecte Stripe e defina os planos.'],
                ['3. Use', 'Relatórios e Rx prontos no primeiro dia.'],
                ['4. Escale', 'Convide médicos e unidades com 1 clique.'],
              ].map(([t, d], i) => (
                <li key={i} className="rounded-2xl border border-base bg-panel p-4">
                  <div className="grid place-items-center w-9 h-9 rounded-full bg-app/60 border border-base text-sm font-semibold mb-2">{i+1}</div>
                  <h3 className="text-[15.5px] font-semibold">{t}</h3>
                  <p className="mt-1.5 text-[14px] text-muted leading-snug">{d}</p>
                </li>
              ))}
            </ol>
          </section>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/parceiros" className="btn rounded-full h-11 px-6 shadow-soft focus-visible:ring-2">
              Quero ser parceiro →
            </Link>
            <Link href="/auth/signin" className="rounded-full h-11 px-6 inline-grid place-items-center border border-base bg-panel hover:bg-panel/80">
              Acessar demo
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  )
}