import Layout from "@/components/Layout"

export default function Terms() {
  return (
    <Layout title="Termos de Uso | Aimnesis" description="Leia os Termos de Uso da Aimnesis LTDA.">
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-6">Termos de Uso</h1>
        <p className="mb-4 text-neutral-700 dark:text-neutral-300">
          Bem-vindo à <strong>Aimnesis LTDA</strong>. Ao acessar ou utilizar nossa plataforma, 
          você concorda integralmente com os presentes Termos de Uso, que regem sua relação 
          com a empresa. Recomendamos a leitura atenta deste documento.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">1. Objeto</h2>
        <p className="mb-4">
          A plataforma visa disponibilizar ferramentas e recursos para otimizar o trabalho de 
          profissionais de saúde, incluindo, mas não se limitando a, registro de atendimentos, 
          geração de relatórios, orientações e integração com outras soluções.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">2. Aceitação</h2>
        <p className="mb-4">
          Ao criar uma conta ou utilizar qualquer funcionalidade, o usuário declara que leu, 
          compreendeu e aceitou todas as condições destes Termos.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">3. Uso da Plataforma</h2>
        <p className="mb-4">
          O uso é restrito a maiores de 18 anos e a profissionais devidamente habilitados. 
          É vedada qualquer utilização para fins ilícitos, falsificação de informações, 
          ou ações que violem leis, regulamentos ou direitos de terceiros.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">4. Limitação de Responsabilidade</h2>
        <p className="mb-4">
          A Aimnesis LTDA não presta serviços médicos, sendo sua atuação restrita ao 
          fornecimento de tecnologia e infraestrutura. As informações inseridas, geradas ou 
          compartilhadas na plataforma são de inteira responsabilidade do usuário.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">5. Alterações</h2>
        <p className="mb-4">
          A Aimnesis LTDA reserva-se o direito de alterar estes Termos a qualquer momento, 
          mediante publicação da nova versão na plataforma, entrando em vigor imediatamente.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-3">6. Foro</h2>
        <p className="mb-4">
          Fica eleito o foro da Comarca de São Paulo/SP como competente para dirimir eventuais 
          controvérsias decorrentes destes Termos, com renúncia a qualquer outro, por mais 
          privilegiado que seja.
        </p>
      </main>
    </Layout>
  )
}