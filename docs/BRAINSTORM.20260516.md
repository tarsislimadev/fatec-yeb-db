- [ ] Define MongoDB collection schema for CNPJ payloads (raw + normalized fields).
- [ ] Implement ingestion flow to fetch CNPJ JSON from API and persist to MongoDB.
- [ ] Add update strategy (upsert by CNPJ, last_sync timestamp).
- [ ] Create basic query endpoints for stored CNPJ records.
- [ ] Add minimal validation/error logging for failed API responses.

- [ ] Register Google Calendar API project and obtain OAuth credentials.
- [ ] Implement OAuth flow (token storage and refresh strategy).
- [ ] Create service to insert events into a target calendar.
- [ ] Add endpoint to schedule meetings with title, time, attendees.
- [ ] Add conflict detection or free/busy check (optional).

- [ ] Choose WhatsApp provider (Cloud API, Twilio, or other) and confirm webhook requirements.
- [ ] Build Python API webhook endpoint for inbound WhatsApp messages.
- [ ] Implement outbound message sender with provider credentials.
- [ ] Add basic command routing (help, status, schedule, lookup).
- [ ] Document Linux deployment steps and required env vars.
