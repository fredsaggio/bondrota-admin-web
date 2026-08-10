# Arquitetura do frontend

O painel usa uma Clean Architecture pragmatica, organizada primeiro por feature e depois por responsabilidade.

```text
src/
├── app/             # Rotas, layouts e composition roots do Next.js
├── features/        # Modulos de negocio independentes
│   ├── auth/
│   ├── dashboard/
│   ├── monitoring/
│   ├── operations/
│   ├── registrations/
│   └── shell/
└── shared/          # Codigo transversal sem conhecimento das features
```

## Camadas de uma feature

- `domain`: modelos e regras puras, sem React, Next.js ou HTTP.
- `application`: casos de uso e orquestracao das operacoes da feature.
- `infrastructure`: adaptadores para API, browser e servicos externos.
- `presentation`: componentes, paginas e hooks React.

Nem toda feature precisa ter as quatro pastas. Uma camada so deve existir quando houver responsabilidade real para ela.

## Direcao das dependencias

```text
app     -> feature/presentation -> application/domain
                             \-> infrastructure -> shared/http
shared  -> nao conhece features
```

O diretorio `src/app` nao contem regra de negocio. Cada arquivo de rota apenas monta a pagina exportada pela feature correspondente.

## Convencoes

1. Novos modelos de negocio ficam no `domain` da feature proprietaria.
2. Fluxos que combinam varias chamadas ficam em `application`.
3. URLs, `fetch`, storage e APIs do browser ficam em `infrastructure`.
4. Estado visual, eventos e JSX ficam em `presentation`.
5. Componentes realmente genericos ficam em `shared/presentation`.
6. Uma feature nao importa a camada `presentation` de outra feature.
7. Evite criar use cases ou interfaces para um CRUD trivial sem regra ou reutilizacao.

## Exemplos

- Sessao administrativa: `features/auth`.
- CRUD de clientes, motoristas e veiculos: `features/registrations`.
- Reservas, viagens e planejamento: `features/operations`.
- Mapa e polling de localizacao: `features/monitoring`.
- Navegacao e layout administrativo: `features/shell`.
- Cliente HTTP compartilhado: `shared/infrastructure`. A sessão administrativa usa cookie HttpOnly emitido pela API e nunca é armazenada no JavaScript.
