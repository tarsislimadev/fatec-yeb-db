# Miner

A Node.js application for mining data from the web and validating it through direct contact.

## Features

- Web Scraper (`crawler.js`): Uses Puppeteer to scrape data from Econodata.
- Validation Caller (`caller.js`): Integrated with PostgreSQL to fetch and process validation calls for company owners and partners.
- Infrastructure: Dockerized environment for easy deployment.
- Protocol: Uses Google Chrome Remote Debug Protocol & WebSocket for browser communication.

## Technology Stack

- Node.js: Core engine.
- Puppeteer: Web scraping.
- PostgreSQL: Data storage.
- Docker: Containerization.

## Data Sources

- [Econodata](https://www.econodata.com.br)

## Data Destination

- PostgreSQL: `postgresql://postgres:postgres@localhost:5432/postgres`

## Getting Started

### Prerequisites

- Node.js (LTS)
- Docker & Docker Compose
- PostgreSQL instance

### Local Development

1. Install Dependencies:
   ```bash
   npm install
   ```

2. Run Crawler:
   ```bash
   node crawler.js
   ```

3. Run Caller:
   ```bash
   node caller.js
   ```

### Docker Deployment

Build and run the container locally:

```bash
docker build -t miner .
docker run --env DATABASE_URL=your_db_url miner
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/postgres` |
| `BROWSER_WS_ENDPOINT` | WebSocket endpoint for Remote Chrome | `ws://localhost:9222/...` |

## Data Process

1. Extraction: `crawler.js` scrapes new companies and CNPJs.
2. Storage: Data is saved to the `companies` table.
3. Validation: `caller.js` retrieves owners/partners and initiates validation (simulated or real).
4. Finalization: Data is marked as validated by the people on the database.
