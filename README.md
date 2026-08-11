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

## Testes

Os testes end-to-end usam Playwright e ficam em `e2e/`.

```bash
npm run test:e2e          # suite principal (sobe o Next sozinho)
npm run test:e2e:ui       # modo interativo
npm run test:e2e:report   # abre o ultimo relatorio HTML
```

A suite principal (`e2e/mocked`) intercepta a API dentro do browser, entao nao
precisa de backend nem de credenciais e roda em todo PR pelo CI.

A suite de smoke (`e2e/smoke`) roda contra a stack publicada, sem mocks, e cobre
o que o mock nao alcanca: atributos do cookie de sessao, CORS e as variaveis de
ambiente do deploy.

```bash
E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... npm run test:e2e:smoke
```

Sem essas variaveis os testes de smoke sao pulados. `E2E_BASE_URL` troca a URL
alvo (por padrao, o painel de producao). O smoke roda com um worker e sem retry
porque o login da API limita as tentativas por identidade.

## Deploy

O painel e implantado na Vercel, que constroi o projeto direto do repositorio. Defina
`NEXT_PUBLIC_API_URL` nas variaveis de ambiente do projeto na Vercel. O valor e
incorporado ao bundle durante o build, entao alterar a variavel exige um novo deploy.

## Docker

O `Dockerfile` serve apenas para execucao self-hosted, fora da Vercel:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.exemplo.com/api/v1 \
  -t bondrota-admin-web .
docker run --rm -p 3000:3000 bondrota-admin-web
```

A imagem usa o `next start` padrao com dependencias de producao, executa com usuario
sem privilegios e possui healthcheck HTTP.

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
