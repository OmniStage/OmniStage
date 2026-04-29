# OmniStage Base Profissional

Base inicial em Next.js para convite, check-in, painel e futura integração com Supabase.

## Rodar local

```bash
npm install
npm run dev
```

## Rotas

- `/` página inicial
- `/convite` convite digital
- `/checkin` entrada/check-in
- `/dashboard` painel do evento

## Próximos passos

1. Conectar Supabase em `lib/supabase.ts`
2. Criar tabelas `eventos`, `convidados`, `checkins`, `envios`
3. Substituir dados mockados por consultas reais
