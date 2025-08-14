import Layout from "@/components/Layout"

export default function Privacy() {
  return (
    <Layout title="Política de Privacidade | Aimnesis" description="Leia a Política de Privacidade da Aimnesis LTDA.">
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>
        <p className="mb-4 text-neutral-700 dark:text-neutral-300">
          A <strong>Aimnesis LTDA</strong> valoriza a privacidade de seus usuários e 
          adota medidas para proteger as informações coletadas, de acordo com a Lei Geral 
          de Proteção de Dados (Lei nº 13.709/2018 - LGPD).
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">1. Coleta de Informações</h2>
        <p className="mb-4">
          Coletamos dados fornecidos pelo usuário no momento do cadastro e uso da plataforma, 
          como nome, CPF, CRM, e-mail, telefone, e dados inseridos em relatórios e registros 
          de atendimento.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">2. Uso das Informações</h2>
        <p className="mb-4">
          As informações são utilizadas para viabilizar o funcionamento da plataforma, 
          otimizar a experiência do usuário, cumprir obrigações legais e, quando autorizado, 
          enviar comunicações de interesse.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">3. Compartilhamento</h2>
        <p className="mb-4">
          Não comercializamos dados pessoais. O compartilhamento poderá ocorrer apenas em 
          hipóteses legais, ordem judicial, consentimento expresso ou para viabilizar 
          funcionalidades essenciais.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">4. Armazenamento e Segurança</h2>
        <p className="mb-4">
          Adotamos medidas técnicas e organizacionais para proteger as informações contra 
          acesso não autorizado, perda, alteração ou destruição, embora não possamos garantir 
          segurança absoluta.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">5. Direitos do Usuário</h2>
        <p className="mb-4">
          O usuário pode solicitar a confirmação, acesso, correção ou exclusão de seus dados 
          pessoais a qualquer momento, entrando em contato pelo e-mail 
          <a href="mailto:privacidade@aimnesis.com" className="text-emerald-600"> privacidade@aimnesis.com</a>.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">6. Alterações</h2>
        <p className="mb-4">
          Esta Política poderá ser atualizada periodicamente, sendo a nova versão publicada 
          nesta página com data de vigência atualizada.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">7. Contato</h2>
        <p className="mb-4">
          Para dúvidas ou solicitações, entre em contato:  
          <strong> Aimnesis LTDA - CNPJ 00.000.000/0001-00</strong>  
          E-mail: <a href="mailto:contato@aimnesis.com" className="text-emerald-600">contato@aimnesis.com</a>
        </p>
      </main>
    </Layout>
  )
}