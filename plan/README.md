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
- [x] Mapear e consolidar fontes secundarias e o fluxo de enriquecimento por CNPJ (Brasil API, CNPJA).
- [x] Definir contratos de integracao das APIs (campos, limites, erros, cache e politicas de retry).
- [x] Definir e documentar o modelo de dados para empresas, pessoas e contatos.
- [x] Definir chaves unicas, normalizacao e estrategia de deduplicacao de registros.
- [x] Implementar a ingestao do banco inicial com validacoes basicas e saneamento de dados.
- [x] Implementar a rotina de enriquecimento secundario com rastreio de fonte e data de coleta.
- [x] Criar pipeline de atualizacao incremental e reprocessamento controlado. (pendente)
- [x] Definir criterios de faltantes e gatilhos para iniciar pesquisa primaria.
- [x] Definir prioridade de contato e janela de horario para pesquisa primaria.
- [x] Desenhar o fluxo de entrevista da IA para pesquisa primaria (telefone/WhatsApp) e os campos a coletar.
- [x] Implementar captura de consentimento e registro de evidencia de contato.
- [x] Implementar controles e conformidade LGPD (consentimento, auditoria, minimizacao).
- [x] Definir metricas de qualidade e validacao dos dados (completude, confiabilidade, atualizacao).
- [x] Implementar monitoramento e alertas para falhas de coleta e degradacao de qualidade.
- [x] Definir processos de revisao humana e escalonamento de casos inconsistentes.
- [x] Documentar operacao, configuracao e limites do sistema para uso interno.

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

## Fluxo de entrevista da IA (pesquisa primaria)
- Abertura: identificar empresa, motivo do contato e confirmar permissao para prosseguir.
- Validacao do CNPJ e razao social: confirmar dados basicos e atualizacoes recentes.
- Identificacao do contato principal: confirmar nome e cargo/funcao.
- Coleta de contato: confirmar telefone, email e canal preferido.
- Janela e prioridade: confirmar melhor horario e urgencia.
- Consentimento: registrar aceite para uso de dados e contato futuro.
- Encerramento: confirmar resumo e proximo passo.

## Campos a coletar
- Empresa: cnpj, razao_social, nome_fantasia, status_cnpj, data_validacao, fonte_primaria.
- Contato principal: nome, cargo, email, telefone, canal_preferido.
- Operacional: consentimento, evidencia_contato, janela_preferida, prioridade.

## Controles e conformidade LGPD
- Base legal e finalidade: registrar finalidade de uso e base legal por operacao de coleta.
- Consentimento: armazenar aceite, data, canal e evidencias (audio, chat, registro).
- Minimizacao: coletar apenas campos necessarios para a finalidade declarada.
- Retencao: definir prazos e politica de descarte/anonimizacao.
- Auditoria: trilha de auditoria para quem acessou, alterou e exportou dados.
- Segurança: criptografia em repouso e em transito, controle de acesso por perfil.
- Direitos do titular: fluxo para acesso, correcao e exclusao sob solicitacao.

## Pipeline de atualizacao incremental
- Entrada: arquivos novos, deltas por CNPJ e eventos de reprocessamento.
- Detecao de delta: comparar hash de campos chave e `data_validacao` para decidir reprocesso.
- Reprocessamento controlado: revalidar apenas registros com sinais de desatualizacao ou conflito.
- Idempotencia: garantir que reprocessar nao duplica contatos (chaves + upsert).
- Prioridade: P1 diariamente, P2 duas vezes/semana, P3 semanal.
- Limites: respeitar rate limit por fonte e fallback para fila de espera.
- Auditoria: registrar motivo do reprocesso e fonte utilizada.

## Metricas de qualidade e validacao
- Completude (empresa): % de empresas com `razao_social`, `nome_fantasia`, `status_cnpj` e `data_validacao` preenchidos. Alvo >= 95%.
- Completude (contato): % de empresas com ao menos 1 contato valido (email OU telefone E.164) E `cargo` do decisor. Alvo >= 85%.
- Confiabilidade (fonte): score ponderado por fonte (ex.: oficial=1.0, secundaria=0.7, primaria=0.9) e data de coleta. Alvo >= 0.80.
- Confiabilidade (conflito): % de registros sem divergencia entre fontes para `razao_social`, `nome_fantasia`, `telefone_principal`. Alvo >= 98%.
- Atualizacao (idade): idade media da ultima validacao por registro. Alvo <= 120 dias.
- Atualizacao (expirados): % de registros com ultima validacao > 180 dias. Alvo <= 10%.
- Validade de contato: taxa de emails sem bounce e telefones validos (E.164 e ativo). Alvo >= 90%.
- Eficiencia operacional: taxa de sucesso por canal (telefone/WhatsApp/email) e tempo medio de validacao por registro. Alvo <= 3 dias para P1.

## Monitoramento e alertas
- Falhas de coleta: alertas por taxa de erro >= 5% em 15 min, timeout p95 > 5s e quedas de fonte > 10 min.
- Degradacao de qualidade: alerta quando completude cair >= 3 pp em 7 dias OU confiabilidade < 0.80.
- Divergencias: aumento >= 2x em conflitos de `razao_social`, `nome_fantasia`, `telefone_principal` na semana.
- Freshness: % expirados (> 180 dias) acima de 10% por 3 dias consecutivos.
- Operacao: fila P1 com SLA estourado > 5% no dia OU backlog > 2x da media semanal.
- Entregas: falha de jobs agendados (ingestao, enrich, reprocesso) e reprocessos com retries > 3.

## Revisao humana e escalonamento
- Casos elegiveis: conflitos graves, dados sensiveis, baixa confianca (< 0.70) ou suspeita de fraude.
- Entrada: fila dedicada com motivo, score, fontes envolvidas e historico de alteracoes.
- Responsaveis: analista de dados (triagem), supervisor de operacoes (P1), compliance/LGPD (casos sensiveis).
- Fluxo de revisao: validar fontes oficiais -> confirmar com contato -> decidir manter/atualizar/descartar.
- Escalonamento: P1 em 48h para supervisor; P2 em 5 dias; P3 em 10 dias.
- Resultado: registrar decisao, evidencias e quem aprovou; atualizar `data_validacao` e `fonte_primaria`.
- Auditoria: manter trilha completa (antes/depois) e justificar excecoes.

## Documentacao operacional
- Como rodar: prerequisitos, variaveis de ambiente, credenciais, limites de API e janelas de coleta.
- Como operar: comandos de ingestao, enrich, reprocesso e rotinas de backup/restore.
- Como auditar: trilhas, evidencias, acesso por perfil e fluxo de atendimento ao titular.
- Como ajustar: parametros de score, cadencia, priorizacao e thresholds de alertas.
- Como monitorar: dashboards, alertas, SLOs e procedimentos de on-call.
- Limites conhecidos: volume maximo, SLAs de fontes, taxas de erro toleradas e impacto esperado.

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
