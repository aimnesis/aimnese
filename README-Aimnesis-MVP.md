# Aimnesis — MVP Unificado (2025-08-10T21:58:33.608045Z)

## 1. Requisitos
- Node.js 18+ (recomendado 20 LTS)
- pnpm 9+ (ou npm/yarn)
- PostgreSQL 14+
- Stripe account (prices configurados)
- Google OAuth (opcional para login)

## 2. Setup rápido
```bash
cp .env.example .env
# edite variáveis (.env)
pnpm install
pnpm db:push
pnpm prisma:studio # opcional
pnpm dev
```

## 3. Deploy
- Vercel:
  - Adicione `.env` no painel.
  - **Stripe webhook**: aponte para `/api/stripe/webhook`.
  - Habilite `EDGE Runtime` apenas se necessário (rotas atuais usam Node).

## 4. MVP PRO
- POST `/api/pro/transcribe` — upload `file` (multipart), retorna `text` (placeholder).
- POST `/api/pro/generate` — body: `{ userId, transcript }`, retorna 6 documentos (placeholder) e grava MedicalQuery.
- POST `/api/stripe/checkout` — body: `{ priceKey, userId }` — cria sessão de checkout.
- POST `/api/stripe/webhook` — atualiza tabela `Subscription`.

## 5. Banco (Prisma)
- Models: `User`, `MedicalQuery`, `Subscription`.
- Ajuste conforme necessário.

## 6. Notas
- Endpoints de PRO estão em **modo placeholder** para você conectar ao Whisper/OpenAI/Anthropic.
- Substitua a lógica de Credentials por fluxo seguro.
- Revise regras de rate-limit e logging antes do lançamento público.
