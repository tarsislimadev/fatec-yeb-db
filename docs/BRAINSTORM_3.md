# BRAINSTORM 3 - Suggested Improvements for Yeb Database

## Objective
Improve reliability, speed, and scalability of CNPJ enrichment and WhatsApp outreach.

## 1. Architecture Suggestions
1. Keep current Python API (Flask) for CNPJ lookup, enrichment, and database writes.
2. Add a dedicated Messaging Service for WhatsApp operations (send, webhook, retry, opt-out).
3. Process outbound messages asynchronously through a queue worker.
4. Separate synchronous flows (lookup UI) from asynchronous flows (campaign delivery).

## 2. Cache Strategy (Recommended)
1. Add Redis as cache database to reduce repeated external calls.
2. Cache CNPJ payloads from public APIs with TTL between 24h and 72h.
3. Cache not-found responses with short TTL (2h to 6h) to avoid API spam.
4. Add idempotency keys for message sending to prevent duplicate WhatsApp messages.

## 3. WhatsApp Integration Options
### Preferred for production
1. Meta WhatsApp Business Platform (Cloud API).
2. Twilio WhatsApp or Gupshup as managed providers.

### Optional for prototype/lab use
1. Node.js service with whatsapp-web.js for quick experiments.
2. Note: this path may have reliability and compliance limitations for business scale.

## 4. Should We Add a Node.js Service?
Yes, if we want clear service boundaries for messaging.

Suggested split:
1. Python service: CNPJ lookup, enrichment, scoring, persistence.
2. Node.js service: template rendering, outbound WhatsApp send, webhook ingestion.
3. Shared PostgreSQL + Redis + queue.

If team prefers one stack only, Python can also implement messaging through official APIs.

## 5. Database Enhancements
Add tables for campaign/messaging lifecycle:
1. `message_templates` - approved templates and variables.
2. `outbound_messages` - queued/sent/delivered/read/failed states.
3. `message_events` - webhook timeline and provider payloads.
4. `contact_consent` - legal basis, consent source, timestamp.
5. `suppression_list` - opt-out and blocked contacts.

## 6. Sending Policy and Safety Rules
1. Only send to validated and normalized phone numbers.
2. Skip low-confidence contacts automatically.
3. Respect quiet hours and max attempts per contact.
4. Stop all sending immediately after opt-out keyword.
5. Log every decision in an audit trail.

## 7. Queue and Retry Model
1. Queue jobs per contact + campaign + template.
2. Worker retries transient failures with exponential backoff.
3. Dead-letter queue for repeated failures.
4. Dashboard for queue depth, failure rate, and processing latency.

## 8. Observability and KPIs
1. CNPJ cache hit ratio.
2. External API error/timeout rate.
3. Message delivery/read/reply/opt-out rates.
4. Conversion from validated record to meeting scheduled.

## 9. MVP Phases
### Phase 1 (1-2 weeks)
1. Add Redis cache.
2. Add idempotency keys.
3. Add outbound message schema.

### Phase 2 (1-2 weeks)
1. Add queue worker and retry flow.
2. Integrate official WhatsApp provider.
3. Ingest webhooks and update message status.

### Phase 3 (1-2 weeks)
1. Add scoring and policy engine.
2. Add KPIs dashboard and alerting.
3. Optimize campaign routing by role and confidence.

## 10. Quick Decision Recommendation
1. Use Redis cache now (high impact, low complexity).
2. Use official WhatsApp API for production.
3. Add Node.js only if we want a separate messaging microservice boundary.
4. Keep compliance and opt-out controls as first-class requirements.
