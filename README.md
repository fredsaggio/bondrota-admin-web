# BondRota Admin

Painel web administrativo do BondRota, construido com Next.js, React e TypeScript.

## Desenvolvimento

```bash
cp .env.example .env.local
npm install
npm run dev
```

A aplicacao usa `NEXT_PUBLIC_API_URL` como URL base da API. O valor deve incluir `/api/v1`.

## Arquitetura

O codigo-fonte fica em `src/` e segue uma Clean Architecture pragmatica organizada por feature. Rotas ficam em `src/app`, regras e telas em `src/features` e recursos transversais em `src/shared`.

Consulte [docs/frontend-architecture.md](docs/frontend-architecture.md) para as camadas, regras de dependencia e convencoes do projeto.

## Funcionalidades

- Login exclusivo para administradores
- Dashboard operacional
- Gestao de destinos, paradas, rotas, horarios, veiculos, motoristas, clientes, vinculos e administradores
- Acompanhamento de reservas, viagens e falhas do planejamento automatico
- Monitoramento da localizacao enviada pelos motoristas
- Upload de fotos e documentos por URL assinada do Supabase Storage
