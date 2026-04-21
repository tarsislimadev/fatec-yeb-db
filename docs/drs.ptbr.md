# Plano de DRS - FATEC Yeb Database

## 1. Objetivo

Criar um Documento de Requisitos de Software (DRS) completo para o projeto, alinhado as orientacoes da aula de 2026-04-14:

- Requisitos funcionais
- Requisitos nao funcionais
- Criterios de aceitacao
- Rastreabilidade
- Priorizacao

Data alvo de entrega: 2026-04-28.

## 2. Contexto do Projeto

O produto valida e enriquece bases comerciais usando:

- Pesquisa secundaria (fontes web e CNPJ)
- Pesquisa primaria (fluxo conversacional por telefone ou WhatsApp na Fase 2)

Objetivo central:

- Melhorar a qualidade da prospeccao para equipes SDR/MDR, identificando dados confiaveis de contato e cargo.

## 3. Escopo do DRS

### Dentro do escopo para DRS v1 (MVP + curto prazo)

- Autenticacao de usuarios e recuperacao de conta
- Cadastro de telefones e modelo de relacionamentos (pessoas, empresas, canais, consentimento)
- Pipeline de enriquecimento por CNPJ (adaptador de provedor, fallback, deduplicacao)
- Busca, filtros e linha do tempo de tentativas de contato
- Controles de conformidade (consentimento e supressao)
- Regras de gestao de contato de prospects e cadencia
- Ciclo de agendamento de reunioes e controle de status
- Pipeline de vendas por produto e registro de pedidos

### Fora do escopo para DRS v1

- Orquestracao completa de chamadas autonomas em escala de producao
- Lead scoring avancado
- Controles empresariais multi-tenant

## 4. Stakeholders e Entradas

- Product Owner: prioridades de negocio e aceitacao
- Engenharia: viabilidade tecnica e restricoes
- Usuarios comerciais (SDR/MDR): requisitos de fluxo de trabalho
- Perspectiva de Compliance/LGPD: restricoes legais para outreach e consentimento

Documentos fonte principais:

- README e README.ptbr
- docs/phone_list_redo_plan.md
- docs/development_plan.md
- Referencias da aula na pasta do repositorio de 2026-04-14

## 5. Plano de Elicitacao

Tecnicas para executar nesta ordem:

1. Entrevistas com Product Owner e um perfil de usuario operacional
2. Workshop para reconciliar conflitos entre requisitos
3. Questionario estruturado para casos de borda e necessidades de relatorios
4. Observacao do fluxo atual de prospeccao (as-is)
5. Revisao de prototipo de baixa fidelidade para telas de lista, detalhes e timeline

Saidas por tecnica:

- Notas de entrevistas -> requisitos funcionais candidatos
- Decisoes de workshop -> prioridade e limites de escopo
- Resultados de questionario -> requisitos nao funcionais e de relatorios
- Notas de observacao -> restricoes de processo e excecoes do mundo real
- Feedback de prototipo -> criterios de aceitacao de usabilidade

## 6. Estrutura do Documento DRS (a ser produzido)

1. Introducao e glossario
2. Objetivos de negocio e escopo
3. Stakeholders e personas de usuario
4. Visao geral do produto e limites do sistema
5. Requisitos funcionais (RF)
6. Requisitos nao funcionais (RNF)
7. Regras de negocio e restricoes de conformidade
8. Criterios de aceitacao por requisito
9. Priorizacao (MoSCoW)
10. Matriz de rastreabilidade
11. Riscos, premissas e dependencias
12. Recomendacao de release (MVP vs Fase 2)

## 7. Rascunho Inicial do Backlog de Requisitos

### Requisitos funcionais (RF)

- RF-001: Usuario pode se cadastrar, entrar e sair
- RF-002: Usuario pode recuperar senha com token unico e expiravel
- RF-003: Usuario pode criar, atualizar e buscar registros de telefone
- RF-004: Usuario pode vincular telefone a pessoa, empresa e departamento
- RF-005: Sistema pode executar consulta de CNPJ e upsert de dados de empresa
- RF-006: Sistema usa provedor fallback quando o provedor primario de CNPJ falha
- RF-007: Usuario pode registrar tentativas de outreach e resultados
- RF-008: Sistema bloqueia outreach quando o consentimento e revogado ou suprimido
- RF-009: Usuario pode criar e gerenciar prospects vinculados a telefone/pessoa/empresa
- RF-010: Sistema aplica regras de cadencia por status do prospect
- RF-011: Usuario pode criar, confirmar, reagendar e cancelar reunioes
- RF-012: Reuniao confirmada remove prospect da fila de outreach frio
- RF-013: Usuario pode criar e gerenciar catalogo de produtos
- RF-014: Usuario pode criar oportunidades e mover entre estagios de venda
- RF-015: Usuario pode adicionar produtos na oportunidade com quantidade, preco e desconto
- RF-016: Sistema pode emitir pedido de venda a partir de oportunidade ganha
- RF-017: Sistema registra toda transicao de estagio com ator, data/hora e motivo

### Requisitos nao funcionais (RNF)

- RNF-001: Resposta da API para consultas comuns abaixo de 800 ms em carga normal
- RNF-002: Autenticacao e tokens de reset devem ser seguros e expiraveis
- RNF-003: Todas as mutacoes de dados devem ser auditaveis
- RNF-004: Integracoes com provedores devem suportar retries e estrategia de timeout
- RNF-005: Logs do sistema devem suportar investigacao de incidentes
- RNF-006: Tratamento de dados deve seguir principios da LGPD

## 8. Estrategia de Criterios de Aceitacao

Cada requisito incluira verificacoes objetivas no formato Dado-Quando-Entao.

Exemplo (RF-006):

- Dado que o provedor primario esta indisponivel
- Quando uma consulta de CNPJ e solicitada
- Entao o provedor fallback e executado automaticamente e o resultado e persistido com metadados de origem

Exemplos adicionais de aceitacao:

- RF-010:
	- Dado que o status do prospect e meeting_scheduled
	- Quando o usuario tenta registrar nova tentativa de outreach frio
	- Entao o sistema rejeita a acao por regra de negocio e registra evento

- RF-011:
	- Dado que os campos obrigatorios da reuniao estao validos
	- Quando o usuario cria uma reuniao
	- Entao o sistema persiste a reuniao com status pending e cria evento de timeline

- RF-015:
	- Dado que a oportunidade esta aberta
	- Quando o usuario adiciona produtos com quantidade e desconto
	- Entao o total estimado e recalculado de forma deterministica

## 14. Artefatos Planejados para Rastrear no DRS

Paginas frontend para rastreabilidade:

- /prospects
- /prospects/{id}
- /meetings/calendar
- /meetings/{id}
- /opportunities
- /opportunities/{id}
- /sales/orders
- /sales/reports

Endpoints backend para rastreabilidade:

- GET /api/v1/prospects
- POST /api/v1/prospects
- GET /api/v1/prospects/{prospectId}
- PATCH /api/v1/prospects/{prospectId}
- POST /api/v1/prospects/{prospectId}/contact-attempts
- GET /api/v1/meetings
- POST /api/v1/meetings
- PATCH /api/v1/meetings/{meetingId}
- POST /api/v1/meetings/{meetingId}/confirm
- POST /api/v1/meetings/{meetingId}/cancel
- GET /api/v1/opportunities
- POST /api/v1/opportunities
- PATCH /api/v1/opportunities/{opportunityId}
- POST /api/v1/opportunities/{opportunityId}/products
- POST /api/v1/opportunities/{opportunityId}/stage-transition
- POST /api/v1/sales/orders
- GET /api/v1/sales/orders/{orderId}
- GET /api/v1/sales/reports/funnel

Tabelas de banco para rastreabilidade:

- prospects
- prospect_status_history
- meetings
- meeting_events
- products
- opportunities
- opportunity_products
- sales_orders
- sales_order_items
- stage_transitions

## 9. Metodo de Priorizacao

Usar MoSCoW:

- Must: auth, CRUD de telefones, enriquecimento de CNPJ, enforcement de consentimento
- Should: visualizacao de timeline, filtros avancados, exportacao
- Could: provedores sociais adicionais, regras de confianca configuraveis
- Won't (v1): motor de campanha de chamadas autonomas em escala

## 10. Modelo de Rastreabilidade

Usar matriz baseada em ID conectando:

- ID do requisito -> Fonte (entrevista/workshop/doc)
- ID do requisito -> User story/tarefa
- ID do requisito -> Caso(s) de teste
- ID do requisito -> Decisao de release

Colunas do template:

- Req ID
- Tipo (RF ou RNF)
- Fonte
- Prioridade
- Responsavel
- ID do Teste de Aceitacao
- Status

## 11. Riscos e Mitigacoes

- Requisitos ambiguos -> executar workshop de validacao antes do congelamento
- Scope creep -> baseline rigida com log de mudancas e revisao de impacto
- Instabilidade de provedores -> fallback + cache + politica de retry
- Incerteza de compliance -> checklist legal explicita por funcionalidade de outreach

## 12. Cronograma ate a Entrega (2026-04-28)

- 2026-04-14 a 2026-04-17: elicitacao e consolidacao de fontes
- 2026-04-18 a 2026-04-21: rascunho de RF, RNF e regras de negocio
- 2026-04-22 a 2026-04-24: criterios de aceitacao e matriz de rastreabilidade
- 2026-04-25 a 2026-04-26: revisao de stakeholders e workshop de priorizacao
- 2026-04-27: QA final de consistencia do documento
- 2026-04-28: submissao final

## 13. Definicao de Pronto para o DRS

- Todos os requisitos possuem IDs unicos
- Todo requisito possui criterios de aceitacao
- Todo requisito esta priorizado
- Matriz de rastreabilidade esta completa
- Limites de escopo estao explicitos
- Stakeholders validaram o rascunho final
