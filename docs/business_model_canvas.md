# Business Model Canvas - YEB (Automatização de Validação de Banco de Dados)

O Business Model Canvas detalha a estrutura de negócios do projeto **YEB**, uma solução projetada para automatizar o enriquecimento e validação de bancos de dados comerciais com o auxílio de IA.

## 1. Segmentos de Clientes (Customer Segments)
* **Equipes de Vendas B2B:** SDRs (Sales Development Representatives) e MDRs (Market Development Representatives).
* **Gestores de Inteligência Comercial e Vendas:** Profissionais focados em otimizar a conversão e eficiência da captação de leads.
* **Empresas B2B:** Organizações de médio a grande porte que dependem fortemente de Outbound Marketing e prospecção ativa.

## 2. Proposta de Valor (Value Propositions)
* **Aumento de Produtividade:** Libera os SDRs/MDRs do trabalho manual de triagem e busca de contatos, permitindo foco em agendamentos de reuniões e vendas.
* **Enriquecimento Inteligente de Dados (Secundário):** Uso de web crawlers e Inteligência Artificial para buscar contatos precisos (nome, e-mail, telefone, cargo) a partir de fontes públicas na web, com base em listas de CNPJs ou empresas.
* **Pesquisa Primária e Validação Ativa:** Robôs conversacionais (Voicebots/Chatbots WhatsApp) com IA que entram em contato com os leads e realizam uma "entrevista" para obter ou confirmar informações antes da passagem do lead para o humano.
* **Conformidade (Compliance):** Arquitetura desenhada junto ao comitê ESG para atuar de acordo com as diretrizes da LGPD na coleta e validação de dados primários e secundários.

## 3. Canais (Channels)
* Vendas Diretas (B2B).
* Plataforma Web (SaaS) própria para configuração de painéis, bancos de dados, e requisitos do cliente.
* Integrações de API / Plugins com as principais ferramentas de CRM de mercado (HubSpot, Salesforce, Pipedrive).

## 4. Relacionamento com o Cliente (Customer Relationships)
* **Onboarding e Setup Personalizado:** Acompanhamento do cliente para definir quais informações da IA ele deseja extrair e treinamento do comportamento do robô.
* **Self-Service:** Painel de configuração no qual o cliente pode subir sua base de dados, determinar quais campos faltam e visualizar o enriquecimento em tempo real.
* **Suporte Técnico Suportado:** Equipe dedicada e gerente de contas.

## 5. Fontes de Receita (Revenue Streams)
* **Mensalidade / Assinatura (SaaS):** Planos mensais ou anuais baseados no limite de processamento de leads por mês.
* **Pay-per-use (Pesquisa Primária):** Cobrança variável (por minuto ou contato realizado) para o uso de ligações ativas com a IA conversacional (WhatsApp / Telefone).
* **Taxas de Setup / Implementação:** Cobranças por integrações customizadas em sistemas legados do cliente.

## 6. Recursos Principais (Key Resources)
* **Tecnológicos:** Algoritmos de Crawler, Modelos de Inteligência Artificial (Ollama, Llama3), Banco de dados transacional e infraestrutura na Nuvem estruturada em contêineres Docker.
* **Intelectuais:** Lógica de arquitetura de software e prompts otimizados para extração/interação de dados.
* **Humanos:** Desenvolvedores (Engenheiros de Dados, Machine Learning, Backend), Product Owner, Scrum Master e equipe Jurídica/Regulatória (LGPD/ESG).

## 7. Atividades Principais (Key Activities)
* **Desenvolvimento Multi-Fases:** Construção da pesquisa secundária (Crawlers + LLMs) na fase inicial, seguida do desenvolvimento da IA conversacional para pesquisa primária.
* **Treinamento e Ajuste Fino de IA:** Calibração dos modelos (Ollama/Llama3) para que interpretem páginas da web corretamente e conversem com leads de forma natural.
* **Gestão de Infraestrutura e Banco de Dados:** Processamento de requisições, orquestração entre crawlers, filas (queues), e persistência em banco PostgreSQL de maneira segura e escalável.
* **Auditoria de Conformidade Legal:** Revisão constante dos processos de captura para manter aderência rígida à LGPD e melhores práticas (ESG).

## 8. Principais Parcerias (Key Partnerships)
* **Fontes de Dados (Data Brokers):** Integração com bases ou APIs especializadas que complementem a inteligência (ex: Econodata, CNPJ Biz e Receita Federal).
* **Provedores de Infraestrutura de Nuvem e Telecomunicação:** Plataformas para hospedagem, processamento de GPU para IA (AWS, Azure) e gateways de comunicação como Twilio (para ligações e WhatsApp API).
* **Consultorias Jurídicas Autorizadas:** Equipes externas ou parcerias de mercado para revisão e assinatura do nível de compliance da solução corporativa.

## 9. Estrutura de Custos (Cost Structure)
* **Infraestrutura e Processamento:** Custos com servidores de banco de dados, armazenamento, e em especial instâncias de computação pesada (GPUs) para inferência do modelo Llama3.
* **Pesquisa Primária e APIs:** Pagamentos por uso de licenças para APIs de comunicação do WhatsApp/Telefonia.
* **Custos com Pessoal:** Salários de equipe de tecnologia, produto, comercial e compliance.
* **Marketing e Vendas:** CAC (Custo de Aquisição de Cliente) direcionado ao esforço de Outbound e canais para demonstração do produto.
