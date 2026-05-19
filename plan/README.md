# Plano

## Target
Automatizar a validacao de banco de dados comercial via pesquisa secundaria e primaria para otimizar o trabalho de MDRs e SDRs no contato com prospects, agendamento de reunioes e venda de produtos.

## Escopo
- Validar banco de dados com CNPJ, razao social, nome fantasia e numero cadastrado na Receita Federal.
- Validacao em dois formatos: fontes secundarias e primarias.
- Pesquisa secundaria em sites das empresas, sites de coleta de informacoes, associacoes, noticias, etc.
- Robo com IA le o banco, busca informacoes e preenche cargos e contatos (nome, email, telefone, cargo), com campos configuraveis.
- Pesquisa primaria para o que nao foi obtido na secundaria, via contato telefonico ou chatbot (WhatsApp).
- Pesquisa primaria preenche ou confirma os mesmos campos conforme necessidade do cliente.
- Projeto deve atender LGPD.

## Tasks
- [x] Mapear e consolidar fontes secundarias e o fluxo de enriquecimento por CNPJ (Brasil API, CNPJA). (done)
- [x] Definir contratos de integracao das APIs (campos, limites, erros, cache e politicas de retry). (done)
- [x] Definir e documentar o modelo de dados para empresas, pessoas e contatos. (done)
- [ ] Definir chaves unicas, normalizacao e estrategia de deduplicacao de registros. (em andamento)
- [x] Implementar a ingestao do banco inicial com validacoes basicas e saneamento de dados. (done)
- [x] Implementar a rotina de enriquecimento secundario com rastreio de fonte e data de coleta. (done)
- [ ] Criar pipeline de atualizacao incremental e reprocessamento controlado. (pendente)
- [ ] Definir criterios de faltantes e gatilhos para iniciar pesquisa primaria. (pendente)
- [ ] Definir prioridade de contato e janela de horario para pesquisa primaria. (pendente)
- [ ] Desenhar o fluxo de entrevista da IA para pesquisa primaria (telefone/WhatsApp) e os campos a coletar. (pendente)
- [x] Implementar captura de consentimento e registro de evidencia de contato. (done)
- [ ] Implementar controles e conformidade LGPD (consentimento, auditoria, minimizacao). (em andamento)
- [ ] Definir metricas de qualidade e validacao dos dados (completude, confiabilidade, atualizacao). (pendente)
- [ ] Implementar monitoramento e alertas para falhas de coleta e degradacao de qualidade. (pendente)
- [ ] Definir processos de revisao humana e escalonamento de casos inconsistentes. (pendente)
- [ ] Documentar operacao, configuracao e limites do sistema para uso interno. (em andamento)
