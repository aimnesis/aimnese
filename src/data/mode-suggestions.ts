// src/data/mode-suggestions.ts
export type ModeKey =
  | 'general'
  | 'studies'
  | 'plantao'
  | 'consultorio'
  | 'specialties'
  | 'analysis';

export const SUGGESTIONS: Record<ModeKey, string[]> = {
  general: [
    'Dor torácica aguda — conduta',
    'Febre >7 dias — quando investigar?',
    'Sinusite aguda — antibiótico?',
    'Dispneia súbita — DDx e exames',
  ],
  studies: [
    'GLP-1 em obesidade — efeitos e segurança',
    'AAS na prevenção primária — quem se beneficia?',
    'Vitamina D — evidência atual em adultos',
    'HFpEF — tratamentos com melhor desfecho',
  ],
  plantao: [
    'SCA — passos imediatos e doses',
    'AVC isquêmico — janela trombólise',
    'Sepse — bundle 1 hora',
    'Asma grave — manejo na sala vermelha',
  ],
  consultorio: [
    'Hipotireoidismo subclínico — quando tratar',
    'DM2 com DRC estágio 3 — metas e ajustes',
    'HAS resistente — investigação e manejo',
    'SAOS — abordagem inicial no adulto',
  ],
  specialties: [
    'Cardio — SCA sem supra: primeiros passos',
    'Neuro — cefaleia em thunderclap: TC/PL?',
    'Pneumo — asma aguda: esquema prático',
    'Endócrino — tireotoxicose: 1ª linha',
  ],
  analysis: [
    'DM2 com nefropatia — plano completo',
    'DPOC exacerbado — RX + prescrição',
    'Lombalgia sem alarme — avaliação e condutas',
    'PAC no adulto — antibiótico e orientações',
  ],
};