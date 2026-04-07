# Yeb database

In this project, we want to get phones.

The project has to find these phones on CNPJ APIs nad other pages.

We want to send WhatsApp messages to people at business.

---

CNPJs are Brazilian Business IDs.

Businesses have people.

People have phone numbers.

We want to send message to Bussines phones via WhatsApp.

WhatsApp Messages must have layout.

## Plan

1. Start from a normalized CNPJ input and validate it before any lookup.
2. Query Brasil API first, then fall back to other public CNPJ sources when needed.
3. Store the company record in PostgreSQL and extract QSA data to identify likely decision-makers.
4. Enrich contacts from public websites and directories, then rank them for SDR or MDR follow-up.
5. Keep an audit trail for every lookup and add compliance checks before any WhatsApp outreach.

## Tools

1. Flask API for lookup endpoints, health checks, and persistence.
2. PostgreSQL tables for companies, contacts, and lookup_audit.
3. Docker Compose to orchestrate the API, database, and web UI locally.
4. Public CNPJ sources such as Brasil API and CNPJA, plus company websites and directories.
5. Frontend validation desk to run CNPJ searches and review recent validations.
6. WhatsApp Business Platform API (Meta Cloud API) for sending template and session messages.
7. Provider options for Brazil operation: Twilio WhatsApp, Z-API, or Gupshup integration.
8. Message template manager for approved outreach text, variables, and language variants.
9. Queue and retry worker (Celery/RQ) to schedule batches, handle failures, and respect rate limits.
10. Delivery webhook listener to track sent, delivered, read, and failed statuses.
11. Opt-out and blocklist module to stop new messages after unsubscribe responses.

## More

1. Prefer secondary research first and use primary contact only as a fallback.
2. Let the customer choose which fields are required, such as name, email, phone, and role.
3. Record source, timestamp, and confidence for every populated field.
4. Review LGPD requirements before any automated WhatsApp or phone workflow.
5. Apply automatic policy rules to skip low-confidence or non-compliant contacts before messaging.
