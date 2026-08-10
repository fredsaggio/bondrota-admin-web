# BondRota Admin — contexto para agentes

## O que é este repositório

Painel web usado pelos administradores do BondRota para operar transporte universitário. Ele consome a API Go do repositório irmão `../bondrota-api` e cobre cadastros, reservas, viagens, planejamento automático, localização de motoristas e rotas dinâmicas.

Antes de alterar contratos HTTP, autenticação, permissões ou nomes de campos, confira a implementação e `docs/api-reference.md` no backend. Não invente respostas da API com base apenas nas telas.

## Stack e execução

- Next.js 16 com App Router, React 19 e TypeScript em modo `strict`.
- Tailwind CSS 4 e estilos globais em `src/app/globals.css`.
- Leaflet/React Leaflet para mapas, Recharts para gráficos e Lucide para ícones.
- Alias de imports: `@/*` aponta para `src/*`.
- Variável obrigatória: `NEXT_PUBLIC_API_URL`, incluindo `/api/v1`.

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
```

Não existe suíte automatizada configurada no `package.json` neste momento. Para qualquer mudança, rode pelo menos lint e typecheck; rode build quando mexer em rotas, configuração, autenticação ou deploy.

## Arquitetura

O projeto usa Clean Architecture pragmática, organizada primeiro por feature. Não introduza `widgets`, `entities` ou outras camadas de Feature-Sliced Design no topo.

```text
src/
├── app/             rotas e composition roots do Next.js
├── features/
│   ├── auth/        sessão administrativa e login
│   ├── dashboard/   resumo operacional
│   ├── monitoring/  mapa, localização e rota ativa
│   ├── operations/  reservas, viagens e planejamento
│   ├── registrations/ cadastros administrativos
│   └── shell/       navegação e layout do painel
└── shared/          código transversal sem conhecimento das features
```

Dentro de uma feature:

- `domain`: tipos e regras puras; não importa React, Next.js ou HTTP.
- `application`: casos de uso e composição de chamadas.
- `infrastructure`: adaptadores HTTP, browser e serviços externos.
- `presentation`: componentes, hooks e páginas React.

Direção esperada das dependências:

```text
app -> feature/presentation -> application/domain
                           -> infrastructure -> shared/infrastructure
shared não importa features
```

Nem toda feature precisa das quatro pastas. Evite abstrações vazias para CRUD simples. Rotas em `src/app` devem apenas montar páginas das features, sem regras de negócio.

## Pontos de entrada importantes

- `src/app/layout.tsx`: providers globais.
- `src/features/auth/presentation/auth-provider.tsx`: estado e proteção da sessão.
- `src/shared/infrastructure/http/api-client.ts`: único cliente HTTP compartilhado.
- `src/shared/infrastructure/http/rest-collection.ts`: helper para CRUD REST.
- `src/features/registrations/infrastructure/registrations-api.ts`: cadastros.
- `src/features/operations/infrastructure/operations-api.ts`: reservas e viagens.
- `src/shared/domain/transport.ts`: vocabulário transversal (`Turno`, `Sentido`).
- `docs/frontend-architecture.md`: explicação mais extensa das camadas.

## Contrato com a API

- A base é `${NEXT_PUBLIC_API_URL}` e já deve terminar em `/api/v1`.
- Use `api<T>()`; não espalhe `fetch` por componentes ou casos de uso.
- JSON da API usa `snake_case`. Os modelos do frontend espelham o contrato; não converta campos isoladamente sem um adaptador explícito.
- Todas as chamadas da API usam `credentials: 'include'`.
- Upload para Supabase é a exceção: peça URL assinada à API e envie o arquivo diretamente com `uploadToSignedURL`.
- `401` em chamadas protegidas dispara `bondrota:unauthorized`; o provider encerra a sessão visual.
- Erros HTTP devem virar `ApiError` e mensagens compreensíveis em português.

Se uma mudança exigir alterar frontend e backend, mantenha os contratos sincronizados e valide os dois repositórios.

## Autenticação e segurança

- O painel é exclusivo para `role=admin`.
- A sessão fica no cookie HttpOnly `bondrota_admin_session`, emitido pela API.
- O login envia `X-Admin-Session-Mode: cookie`, consulta `/admin/session` e encerra em `/admin/logout`.
- Nunca volte a armazenar JWT em `localStorage`, `sessionStorage`, estado React ou cookie acessível por JavaScript.
- Não adicione secrets em variáveis `NEXT_PUBLIC_*`: elas são incorporadas ao bundle público.
- O frontend não é fronteira de autorização. Toda permissão deve continuar validada pela API.
- Preserve `credentials: 'include'`, CORS com origem exata e o fluxo de cookie ao mexer no cliente HTTP.

## Domínio em uma frase

- Clientes possuem vínculos de estudante/estágio com destino, turno e rota interna.
- Vínculos originam reservas de `ida` ou `volta` para uma data.
- O planejamento agrupa demanda em ciclos e viagens, alocando veículo e motorista.
- Motoristas atualizam execução, presença e localização; o admin monitora tudo no painel.
- Rotas internas são sequências fixas de paradas; rotas dinâmicas são calculadas por viagem.

## Convenções de implementação

- UI e mensagens para usuário devem permanecer em português do Brasil.
- Prefira imports absolutos com `@/`.
- Preserve tipos estritos; evite `any`, casts amplos e duplicação de modelos.
- Componentes genéricos ficam em `shared/presentation`; componentes de negócio ficam na feature dona.
- Chamadas combinadas pertencem à camada `application`, preferencialmente paralelas quando independentes.
- Use `'use client'` somente em módulos que realmente dependem de hooks, eventos ou APIs do browser.
- Preserve estados de loading, vazio, erro e confirmação em telas assíncronas.
- Não edite `.next`, `next-env.d.ts`, `node_modules` ou artefatos gerados.

## Deploy

- `next.config.ts` usa `output: 'standalone'`.
- O `Dockerfile` é multi-stage, executa como usuário sem privilégios e possui healthcheck.
- `NEXT_PUBLIC_API_URL` é definido no build da imagem, não apenas no runtime.

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.exemplo.com/api/v1 -t bondrota-admin-web .
```

## Checklist de conclusão

1. Confirme que a mudança respeita as fronteiras de feature/camada.
2. Confira o contrato real da API quando houver dados ou permissões envolvidos.
3. Rode `npm run lint` e `npm run typecheck`.
4. Rode `npm run build` para mudanças com impacto de produção.
5. Não inclua artefatos gerados, secrets ou alterações alheias à tarefa.
