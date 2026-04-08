# Business Model Canvas - YEB (Validacao e Enriquecimento de Base B2B)

O Business Model Canvas abaixo foi atualizado com base em BRAINSTORM_3 e no que ja esta implementado em src/api e src/database: lookup de CNPJ com cache Redis, fila assincrona de mensagens, worker de entrega WhatsApp, webhook de eventos e trilha de consentimento/supressao.

## 1. Segmentos de Clientes (Customer Segments)
* Equipes de vendas B2B (SDR/MDR) com alto volume de prospeccao outbound.
* Operacoes de Revenue Ops e Inteligencia Comercial que precisam melhorar qualidade da base.
* Empresas B2B de medio e grande porte com stack de CRM e metas de produtividade/compliance.

## 2. Proposta de Valor (Value Propositions)
* Validacao de CNPJ e enriquecimento automatizado com cache para reduzir tempo e custo operacional.
* Pipeline de outreach WhatsApp com fila, idempotencia, webhook de status e bloqueio por opt-out.
* Separacao clara entre fluxo sincrono (lookup) e fluxo assincrono (campanhas), melhorando escalabilidade.
* Compliance operacional: trilha de auditoria, consentimento e suppression list aderentes a LGPD.

## 3. Canais (Channels)
* Vendas consultivas diretas para operacoes comerciais B2B.
* Plataforma web para acompanhamento de empresas, mensagens e status operacional.
* APIs para integracao com CRM e ferramentas internas do cliente.

## 4. Relacionamento com o Cliente (Customer Relationships)
* Onboarding orientado por playbook de dados (campos obrigatorios, templates e politicas de envio).
* Operacao assistida com suporte tecnico para ajustes de templates, webhooks e integracoes.
* Evolucao continua por KPI (taxa de entrega, leitura, resposta, opt-out e qualidade da base).

## 5. Fontes de Receita (Revenue Streams)
* Assinatura SaaS por faixa de volume de CNPJ processado e contatos monitorados.
* Cobranca por uso em mensageria (mensagens enviadas/processadas por provedor).
* Projetos de implementacao: integracoes, modelos de template e governanca de dados.

## 6. Recursos Principais (Key Resources)
* Plataforma Python (Flask API + worker RQ), PostgreSQL, Redis e ambiente Docker Compose.
* Modelos e regras de negocio para deduplicacao, idempotencia, validacao de telefone e supressao.
* Base de templates, eventos e auditoria para rastreabilidade ponta a ponta.
* Time multidisciplinar de engenharia, produto e compliance/LGPD.

## 7. Atividades Principais (Key Activities)
* Enriquecimento e persistencia de dados de CNPJ com fallback e cache por TTL.
* Orquestracao de campanha por fila (queue), retries e processamento assincrono com worker.
* Ingestao de webhook e atualizacao de ciclo de vida das mensagens (queued/sent/delivered/read/failed/replied/blocked).
* Monitoramento de KPIs operacionais e melhoria de politica de envio (quiet hours, tentativas, opt-out).

## 8. Principais Parcerias (Key Partnerships)
* Provedores de dados empresariais (BrasilAPI, CNPJA e outras fontes de enriquecimento).
* Provedores de mensageria oficial (Meta WhatsApp Business Platform; alternativas como Twilio/Gupshup).
* Parceiros de infraestrutura cloud e observabilidade.
* Apoio juridico para governanca de consentimento e tratamento de dados.

## 9. Estrutura de Custos (Cost Structure)
* Infraestrutura de execucao e armazenamento (containers, banco, cache e rede).
* Custos variaveis de provedores externos (consultas de dados e mensagens WhatsApp).
* Manutencao de engenharia e operacao (desenvolvimento, monitoramento e suporte).
* Custos de compliance, seguranca e governanca de dados.
