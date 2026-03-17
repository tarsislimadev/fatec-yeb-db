# YEB - Automatização de Validadação de Banco de Dados

## Objetivo

Automatizar o processo de validação de banco de dados comercial através de pesquisa secundária e primária, a fim de otimizar o processo comercial dos MDRs e SDRs no contato com prospects, agendamento de reuniões e venda de produtos.

## Escopo

- [ ] Sistema que valida um banco de dados contendo informações básicas de determinadas empresas, como CNPJ, razão Social, Nome fantasia e número cadastrado na Receita Federal

- [ ] A validação terá dois formatos, a partir de fontes secundárias e primárias

- [ ] Fontes secundárias poderão ser usados sites das empresas, sites especializados em coletas de informações de contatos, associações, notícias, etc

- [ ] O robô com IA fará a leitura das informações do Banco de dados, buscará as informações e preencherá com as informações dos cargos das pessoas pré-requisitadas pelo cliente no sistema. As informações serão: Nome, email, telefone e cargo. Outras informações poderão ser solicitadas pelo cliente na área de configuração.

- [ ] Pesquisa secundária será necessária para as informações que não foram coletadas pela pesquisa secundária. Essa envolve uma segunda etapa do projeto, onde a pesquisa será feita por uma IA em contato telefônico ou chatbot por whatsapp. Será treinada uma entrevista com a IA que entrará em contato com os telefones encontrados pela pesquisa secundária e identificar as informações pré-selecionadas acima pelo cliente.

- [ ] A pesquisa preencherá os mesmos campos que a pesquisa secundária não conseguiu preencher ou conferir as informações, também de acordo com a necessidade do cliente

- [ ] O processo deverá envolver a equipe de ESG para desenvolver de acordo com as normas de LGPD, principalmente a pesquisa primária."

## Pessoas

[Scrum Master e Product Owner - Tarsis](https://github.com/tarsislimadev)

[Desenvolvedor - Emmanuel](https://github.com/emannuelp-boldrin)

## Como Rodar o Projeto

Este projeto utiliza Docker para orquestrar o banco de dados, o crawler e o serviço de IA (Ollama).

### Pré-requisitos
- Docker e Docker Compose instalados.

### Passos
1. **Inicie os serviços:**
   ```bash
   docker compose up -d --build
   ```

2. **Acompanhe os logs do Crawler:**
   ```bash
   docker compose logs -f crawler
   ```

3. **Verifique os dados no Banco de Dados:**
   O banco de dados PostgreSQL estará acessível na porta `5432`. Você pode usar ferramentas como DBeaver ou `psql` para visualizar a tabela `companies`.

4. **Funcionamento da IA:**
   O serviço `ollama` baixará automaticamente o modelo `llama3` na primeira execução. Certifique-se de ter uma conexão estável com a internet.

## Licença

[Apache-2.0](./LICENSE)
