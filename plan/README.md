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
- [x] Definir chaves unicas, normalizacao e estrategia de deduplicacao de registros. (done)
- [x] Implementar a ingestao do banco inicial com validacoes basicas e saneamento de dados. (done)
- [x] Implementar a rotina de enriquecimento secundario com rastreio de fonte e data de coleta. (done)
- [ ] Criar pipeline de atualizacao incremental e reprocessamento controlado. (pendente)
- [x] Definir criterios de faltantes e gatilhos para iniciar pesquisa primaria. (done)
- [x] Definir prioridade de contato e janela de horario para pesquisa primaria. (done)
- [ ] Desenhar o fluxo de entrevista da IA para pesquisa primaria (telefone/WhatsApp) e os campos a coletar. (pendente)
- [x] Implementar captura de consentimento e registro de evidencia de contato. (done)
- [ ] Implementar controles e conformidade LGPD (consentimento, auditoria, minimizacao). (em andamento)
- [ ] Definir metricas de qualidade e validacao dos dados (completude, confiabilidade, atualizacao). (pendente)
- [ ] Implementar monitoramento e alertas para falhas de coleta e degradacao de qualidade. (pendente)
- [ ] Definir processos de revisao humana e escalonamento de casos inconsistentes. (pendente)
- [ ] Documentar operacao, configuracao e limites do sistema para uso interno. (em andamento)

## Criterios de faltantes e gatilhos (pesquisa primaria)
- Faltantes criticos (iniciar pesquisa primaria): ausencia de pelo menos 1 contato valido (telefone E.164 ou email) OU ausencia de cargo/funcao do decisor.
- Faltantes relevantes (iniciar pesquisa primaria se SLA permite): ausencia de nome do contato principal OU dados desatualizados (ultima confirmacao > 180 dias).
- Conflito de fontes (iniciar pesquisa primaria): divergencia entre fontes secundarias sobre razao social, nome fantasia ou telefone principal.
- Suspeita de invalidez (iniciar pesquisa primaria): telefone invalido, email com bounce, CNPJ inativo/baixado ou razao social divergente da base oficial.
- Limite de fontes (iniciar pesquisa primaria): nenhuma fonte secundaria confiavel encontrada OU score de confianca abaixo do minimo configurado.
- Gatilho operacional: conta prioritaria, campanha ativa ou janela de contato dentro do horario permitido.

## Regras de priorizacao
- P1: contas estrategicas com faltantes criticos ou conflito de fontes.
- P2: faltantes relevantes com baixa confianca e data de coleta antiga.
- P3: apenas enriquecimento leve (ex.: confirmar cargo/telefone).

## Prioridade de contato e janela de horario
- Janela padrao (dias uteis): 09:00-12:00 e 14:00-18:00 no fuso da empresa.
- Janela alternativa (sabado): 09:00-12:00 apenas para contas P1 e com consentimento.
- Evitar contato: domingos e feriados locais.
- Ordem de tentativas (por empresa): telefone fixo -> telefone movel/WhatsApp -> email.
- Cadencia por contato: ate 3 tentativas em 7 dias (D1, D3, D7), com pausa minima de 24h.
- Escalonamento: se P1 falhar em 7 dias, abrir tarefa manual; se P2/P3 falhar, reavaliar em 30 dias.

## Saidas esperadas da pesquisa primaria
- Confirmar/atualizar contato principal (nome, cargo, email, telefone).
- Registrar evidencias de contato e consentimento quando aplicavel.
- Atualizar data de validacao e fonte primaria utilizada.

## Chaves unicas e deduplicacao
- Empresas: chave natural `cnpj` (normalizado para 14 digitos). `razao_social` e `nome_fantasia` sao atributos, nao chaves.
- Pessoas: chave primaria `id`. Chave composta candidata para dedupe: `cpf` (quando existir) + `nome` normalizado + `data_nascimento` (quando existir). Sem `cpf`, usar `nome` normalizado + `data_nascimento` + `telefone` como heuristica.
- Telefones: normalizar para E.164 e deduplicar por `phone_number` + `country_code`.
- Emails (quando existirem): normalizar (lowercase) e deduplicar por `email`.
- Normalizacao de texto: trim, lowercase, remover acentos e pontuacao para campos de comparacao.
- Estrategia: dedupe deterministico por chaves naturais e regras de normalizacao; em seguida, dedupe probabilistico com score simples (nome + data + contato) para sugerir merges manuais.
