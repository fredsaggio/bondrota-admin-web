# BondRota Admin

Painel web administrativo do BondRota, construido com Next.js, React e TypeScript.

## Desenvolvimento

```bash
cp .env.example .env.local
npm install
npm run dev
```

A aplicacao usa `NEXT_PUBLIC_API_URL` como URL base da API. O valor deve incluir `/api/v1`.

A autenticação administrativa usa cookie HttpOnly. A API deve incluir a origem exata do painel em `ALLOWED_ORIGINS`, habilitar credenciais CORS e usar HTTPS em produção.

## Docker

O valor de `NEXT_PUBLIC_API_URL` é incorporado ao bundle durante o build:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.exemplo.com/api/v1 \
  -t bondrota-admin-web .
docker run --rm -p 3000:3000 bondrota-admin-web
```

A imagem usa o modo standalone do Next.js, executa com usuário sem privilégios e possui healthcheck HTTP.

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
