# Aimnesis – Clinical Evidence Assistant (Prototype)

Este projeto demonstra como construir uma aplicação semelhante ao OpenEvidence utilizando Next.js, NextAuth e a API da OpenAI.  Ele foi construído como base para customização e não está totalmente conectado a um banco de dados ou sistema de verificação de CRM.  Após instalar as dependências e fornecer as chaves necessárias, você poderá executar a aplicação localmente.

## Pré‑requisitos

- Node.js >= 18
- npm ou pnpm
- Conta na OpenAI para gerar respostas (defina `OPENAI_API_KEY`)
- Um segredo para o NextAuth (`NEXTAUTH_SECRET`)

## Configuração

1. Clone este repositório.
2. Renomeie `.env.example` para `.env.local` e defina suas chaves:
   ```dotenv
   OPENAI_API_KEY=chave_da_openai
   NEXTAUTH_SECRET=uma_frase_secreta
   NEXTAUTH_URL=http://localhost:3000
   # Usuário demo para login (opcional)
   DEMO_EMAIL=doctor@example.com
   DEMO_PASSWORD=password123
   ```
   # Defina o idioma padrão (opcional: en ou pt)
   NEXT_PUBLIC_DEFAULT_LOCALE=en
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Execute a aplicação em modo de desenvolvimento:
   ```bash
   npm run dev
   ```
   A aplicação estará disponível em `http://localhost:3000`.

5. Para gerar a versão de produção:
   ```bash
   npm run build
   npm start
   ```

## Sobre a implementação

O projeto usa o roteamento de páginas do Next.js (pasta `src/pages`) e inclui:

- Uma página inicial (`/`) com barra de busca e categorias de perguntas.
- Uma rota dinâmica (`/ask/[id]`) que obtém a pergunta da URL, chama a API interna e exibe a resposta com referências.
- Página `/voice` com gravação de voz: permite gravar a pergunta em português usando a API de reconhecimento de voz do navegador e enviá-la à API `/api/ask` para gerar resposta ou documento.
- Páginas de login e cadastro de demonstração usando NextAuth com `CredentialsProvider`.
- Uma API interna (`/api/ask`) que chama a API da OpenAI para gerar respostas.  Na versão final, você deverá implementar um pipeline de *retrieval augmented generation* usando seu próprio corpus de textos médicos.
- Páginas para perfil de usuário (`/settings/profile`) exibindo dados da sessão.

## Multilíngue e internacionalização

O projeto utiliza **react‑i18next** e **next‑i18next**.  Os arquivos de tradução estão em `public/locales/en/common.json` e `public/locales/pt/common.json`.  Um seletor de idiomas no cabeçalho permite alternar entre inglês e português.  Para adicionar novos idiomas, adicione pastas e arquivos de tradução e configure `next-i18next.config.js`.

## Gravação de voz e geração de documentos

A página `/voice` utiliza a API Web Speech para transcrever áudio (navegadores Chrome/Edge).  O botão “Enviar Pergunta” envia a transcrição para a rota `/api/ask`.  O botão “Gerar Documento” reutiliza a mesma chamada, mas você pode apontá-lo para um endpoint diferente que gere anamneses estruturadas, hipóteses diagnósticas e planos terapêuticos.

## Próximos passos sugeridos

1. **Persistência de dados**: integre um banco de dados (PostgreSQL ou MongoDB) usando Prisma para armazenar usuários, consultas e referências.
2. **Verificação de CRM/NPI**: utilize uma API para validar profissionais de saúde durante o cadastro.
3. **Melhorar o cadastro**: implemente fluxo real de criação de usuários e redefinição de senha.
4. **Anúncios e monetização**: crie módulos e tabelas para anúncios segmentados (farmacêuticas, dispositivos médicos) e um painel administrativo.
5. **Escalabilidade e deploy**: utilize serviços como Vercel, AWS ou GCP para hospedar a aplicação com certificados SSL e CDN.

Este repositório é um ponto de partida.  Para chegar a um produto comparável ao OpenEvidence, será necessário adicionar verificação profissional, curadoria de conteúdo, integração com EHRs, mecanismos de publicidade e reforço de segurança (LGPD/HIPAA).# aimnese
