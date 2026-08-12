# Project Brief — fatec-yeb-db

Resumo Executivo

- O que: Plataforma web para enriquecimento, gestão e qualidade de dados (CNPJ, pessoas e telefones), com backend API e frontend SPA. O repositório contém serviços de importação/enriquecimento (integração com APIs de CNPJ), pipelines de migração/seed, controles de qualidade e filas/revisões humanas.
- Por que: Reduzir erros de dados e acelerar processos de pesquisa/validação para equipes que mantêm bases de contatos e dados comerciais.
- Resultado esperado (MVP): API REST para importação e consulta, UI para visualização e revisão, e métricas básicas de qualidade.

Objetivos

- Primário: Entregar um MVP que permita importar CNPJs e registros de pessoas/telefones, enriquecer com dados externos e fornecer uma interface para revisão/qualidade.
- Secundários: Automatizar migrações e seed do banco, prover testes de integração, e definir critérios de sucesso mensuráveis (ex.: reduzir erros detectados em 30% no primeiro trimestre de uso).

Escopo (inclusões)

- API/backend: endpoints para CNPJ, pessoas, telefones, importação, enriquecimento e filas de revisão (veja `backend/src/controllers`).
- Frontend: páginas de pesquisa, detalhe, criação e fila de revisão (veja `frontend/src/pages`).
- Infra & dados: scripts de migração/seed (`backend/src/db/migrate.js`, `backend/src/db/seed.js`), suporte a PostgreSQL (`pg`) e Redis para caching/filas.
- Testes: testes unitários e de integração já presentes (Jest/Vitest/Playwright).

Fora do escopo (MVP)

- Integrações empresariais complexas com provedores pagos além dos adaptadores já implementados.
- Analytics avançado ou dashboards BI completos (apenas métricas e alertas básicos no MVP).

Entregáveis (MVP)

- API REST funcional com documentação mínima (endpoints principais para CRUD e importação).
- UI responsiva com páginas: Dashboard, Pesquisa/Detalhe de CNPJ, Pessoas, Telefones, Qualidade e Fila de Revisão.
- Scripts de deploy local com `docker-compose` para ambiente de desenvolvimento/testes.
- Migrações e seed automatizados.
- Suíte básica de testes e instruções para executar testes localmente.

Cronograma e Marcos (sugestão prática)

- Semana 1: Stabilizar ambiente de desenvolvimento (containers, migrations, seed), rodar testes existentes.
- Semana 2: API — endpoints de importação/enriquecimento + testes de integração.
- Semana 3: Frontend — páginas principais e integração com API.
- Semana 4: QA, ajustes, documentação e release do MVP.

Recursos & Orçamento (estimativa)

- Equipe mínima: 1 backend, 1 frontend, 0.5 QA/product (part-time) por 4 semanas.
- Infra: PostgreSQL, Redis, ambiente Docker para dev/test; CI com executores que suportem containers.

Riscos Principais

- Dados externos inconsistentes: provedores de CNPJ/terceiros podem retornar formatos inesperados — mitigar com adaptadores robustos e validações.
- Qualidade dos dados de entrada: importações em massa podem introduzir ruído; mitigar com validações e jobs de deduplicação.
- Dependência de infraestrutura: latência ou indisponibilidade do Redis/Postgres em staging; mitigar com testes de resiliência.

Critérios de Sucesso (KPI)

- Operacional: API atingível e testada, UI navegável, scripts de migração funcionais.
- Impacto: redução de erros de dados detectados (meta: -30% em 3 meses) ou aumento de registros validados (meta: +50% de registros com dados enriquecidos).
- Engajamento: tempo médio de revisão por item reduzido em X% após melhorias de UX (meta a definir pelo time).

Stakeholders & Comunicação

- Product Owner / Dono do Conteúdo: equipe Fatec YEB / mantenedores do repositório.
- Responsáveis Técnicos: desenvolvedores backend/frontend listados no `README.md` e `package.json`.
- Canal de comunicação: issues e pull requests no GitHub para decisões técnicas; reuniões quinzenais para alinhamento de progresso.

Tech Stack (observado no repositório)

- Backend: Node.js (>=18), Express, PostgreSQL (`pg`), Redis, Jest, Supertest. Ver: [backend/package.json](backend/package.json#L1).
- Frontend: React + Vite, TailwindCSS, Zustand, Vitest/Playwright. Ver: [frontend/package.json](frontend/package.json#L1).

Próximos passos recomendados

- Rodar localmente as migrations e seed e executar a suíte de testes (ver `backend/package.json` scripts `migrate`, `seed`, `test:ci`).
- Priorizar endpoints críticos para importação/enriquecimento e um fluxo mínimo de revisão no frontend.
- Documentar RPC de importação/enriquecimento e exemplos de payloads para integradores.
