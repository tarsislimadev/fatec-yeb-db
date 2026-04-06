# FATEC Yeb Database

## Objective

Automate the commercial database validation process through secondary and primary research, in order to optimize the business process of MDRs and SDRs in prospect contact, meeting scheduling, and product sales.

## Scope

- [ ] System that validates a database containing basic information of certain companies, such as CNPJ, legal name, business name, and number registered with the Federal Revenue Service

- [ ] The validation will have two formats, from secondary and primary sources

- [ ] Secondary sources may include company websites, websites specialized in collecting contact information, associations, news, etc.

- [ ] The AI robot will read information from the database, search for information and fill it with information from the positions of people pre-requisitioned by the customer in the system. The information will be: Name, email, phone, and position. Other information may be requested by the customer in the configuration area.

- [ ] Primary research will be necessary for information that was not collected by secondary research. This involves a second stage of the project, where research will be conducted by an AI through phone contact or WhatsApp chatbot. An interview will be trained with the AI that will contact the phone numbers found during secondary research and identify the pre-selected information above by the customer.

- [ ] The research will fill in the same fields that secondary research could not fill or verify the information, also according to customer needs

- [ ] The process should involve the ESG team to develop in accordance with LGPD regulations, especially primary research.

## Use of CNPJ APIs

The system integrates the use of automated queries to CNPJ APIs as a method for data acquisition and enrichment. Through services such as **Brasil API** and **[CNPJA (Open API)](https://cnpja.com/en/api/open)**, the crawler performs direct searches using the company's CNPJ, capturing official data such as registration status, registered contacts, and the Board of Members and Administrators (QSA). This information provides a qualified basis for the Artificial Intelligence to identify decision-makers in the subsequent stage.

## Team

[Scrum Master and Product Owner - Tarsis](https://github.com/tarsislimadev)

[Developer - Emmanuel](https://github.com/emannuelp-boldrin)

## How to Run the Project

This project uses Docker to orchestrate the database, crawler, and AI service (Ollama).

### Prerequisites
- Docker and Docker Compose installed.

### Steps
1. **Start the services:**
```bash
docker compose up -d --build
```

2. **Follow the Crawler logs:**
```bash
docker compose logs -f crawler
```

3. **Check the data in the Database:**
The PostgreSQL database will be accessible on port `5432`. You can use tools like DBeaver or `psql` to view the `companies` table.

4. **AI Functionality:**
The `ollama` service will automatically download the `llama3` model on first execution. Make sure you have a stable internet connection.

## License

[Apache-2.0](./LICENSE)
