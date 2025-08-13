# MVP Patch v2 (Aimnesis)

## O que este patch adiciona
- `prisma/schema.prisma` com `User`, `MedicalQuery`, `Subscription`, `GeneratedDoc`.
- `/api/settings/profile` (GET/POST) para ler/salvar perfil do médico.
- `/api/ask` atualizado: associa `userId` quando logado, retorna `sources`, e rate-limit básico por IP.
- NextAuth atualizado para redirecionar pós-login para `/dashboard`.
- Endpoints Stripe: `/api/billing/checkout` e `/api/billing/webhook`.
- `src/lib/stripe.ts` e `.env.example` com variáveis necessárias.

## Como aplicar
1. Descompacte este zip na **raiz do projeto** e aceite sobrescrever arquivos quando solicitado.
2. Copie `.env.example` para `.env` e preencha.
3. Instale dependências (se ainda não tiver):  
   ```bash
   npm i @prisma/client prisma bcryptjs stripe
   ```
4. Gere/migre o banco:  
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init_mvp_v2
   ```
5. Rodar em dev:  
   ```bash
   npm run dev
   ```

> Observação: o webhook do Stripe precisa ser exposto via `stripe listen` e a URL configurada em `/api/billing/webhook`.
