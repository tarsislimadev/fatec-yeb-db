# DRS Plan - FATEC Yeb Database

## 1. Purpose

Create a complete Software Requirements Document (DRS) for the project, aligned with the class guidance from 2026-04-14:

- Functional requirements
- Non-functional requirements
- Acceptance criteria
- Traceability
- Prioritization

Target delivery date: 2026-04-28.

## 2. Project Context

The product validates and enriches commercial databases using:

- Secondary research (web and CNPJ sources)
- Primary research (phone or WhatsApp conversational flow in Phase 2)

Core goal:

- Improve prospecting quality for SDR/MDR teams by identifying reliable contact and role data.

## 3. DRS Scope

### In scope for DRS v1 (MVP + near-term)

- User authentication and account recovery
- Phone registry and relationship model (people, businesses, channels, consent)
- CNPJ enrichment pipeline (provider adapter, fallback, deduplication)
- Search, filters, and timeline of contact attempts
- Compliance controls (consent and suppression)
- Prospect contact management rules and cadence
- Meeting scheduling lifecycle and status controls
- Productized sales pipeline and order registration

### Out of scope for DRS v1

- Full autonomous calling orchestration in production scale
- Advanced lead scoring
- Multi-tenant enterprise controls

## 4. Stakeholders and Inputs

- Product Owner: business priorities and acceptance
- Engineering: technical feasibility and constraints
- Commercial users (SDR/MDR): workflow requirements
- Compliance/LGPD viewpoint: legal constraints for outreach and consent

Primary source documents:

- README and README.ptbr
- docs/phone_list_redo_plan.md
- docs/development_plan.md
- Class references from 2026-04-14 repository folder

## 5. Elicitation Plan

Techniques to run in this order:

1. Interviews with Product Owner and one operational user profile
2. Workshop to reconcile conflicts across requirements
3. Structured questionnaire for edge cases and reporting needs
4. Observation of current prospecting flow (as-is)
5. Low-fidelity prototype review for list, details, and timeline screens

Outputs per technique:

- Interview notes -> candidate functional requirements
- Workshop decisions -> priority and scope boundaries
- Questionnaire results -> non-functional and reporting requirements
- Observation notes -> process constraints and real-world exceptions
- Prototype feedback -> usability acceptance criteria

## 6. DRS Document Structure (to be produced)

1. Introduction and glossary
2. Business objectives and scope
3. Stakeholders and user personas
4. Product overview and system boundaries
5. Functional requirements (RF)
6. Non-functional requirements (RNF)
7. Business rules and compliance constraints
8. Acceptance criteria by requirement
9. Prioritization (MoSCoW)
10. Traceability matrix
11. Risks, assumptions, and dependencies
12. Release recommendation (MVP vs Phase 2)

## 7. Initial Requirement Backlog Draft

### Functional requirements (RF)

- RF-001: User can sign up, sign in, and sign out
- RF-002: User can recover password with one-time expiring token
- RF-003: User can create, update, and search phone records
- RF-004: User can link phone to person, business, and department
- RF-005: System can run CNPJ lookup and upsert business data
- RF-006: System uses fallback provider when primary CNPJ provider fails
- RF-007: User can record outreach attempts and outcomes
- RF-008: System blocks outreach when consent is revoked or suppressed
- RF-009: User can create and manage prospect records linked to phone/person/business
- RF-010: System enforces contact cadence rules by prospect status
- RF-011: User can create, confirm, reschedule, and cancel meetings
- RF-012: Confirmed meeting removes prospect from cold outreach queue
- RF-013: User can create and manage product catalog records
- RF-014: User can create opportunities and move across sales stages
- RF-015: User can add products to an opportunity with quantity, price, and discount
- RF-016: System can issue sales orders from won opportunities
- RF-017: System stores every stage transition with actor, timestamp, and reason

### Non-functional requirements (RNF)

- RNF-001: API response for common queries under 800 ms at normal load
- RNF-002: Authentication and reset tokens must be secure and expiring
- RNF-003: All data mutations must be auditable
- RNF-004: Provider integrations must support retries and timeout strategy
- RNF-005: System logs must support incident investigation
- RNF-006: Data handling must follow LGPD principles

## 8. Acceptance Criteria Strategy

Each requirement will include objective checks with Given-When-Then style.

Example (RF-006):

- Given primary provider is unavailable
- When a CNPJ lookup is requested
- Then the fallback provider is executed automatically and result is persisted with source metadata

Additional acceptance examples:

- RF-010:
	- Given prospect status is meeting_scheduled
	- When user tries to register a cold outreach attempt
	- Then system rejects action with business-rule violation and logs event

- RF-011:
	- Given required meeting fields are valid
	- When user creates a meeting
	- Then system persists meeting with pending status and creates timeline event

- RF-015:
	- Given an open opportunity
	- When user adds products with quantity and discounts
	- Then estimated total is recalculated deterministically

## 14. Planned Implementation Artifacts to Trace in DRS

Frontend pages to trace in requirement mapping:

- /prospects
- /prospects/{id}
- /meetings/calendar
- /meetings/{id}
- /opportunities
- /opportunities/{id}
- /sales/orders
- /sales/reports

Backend endpoints to trace in requirement mapping:

- GET /api/v1/prospects
- POST /api/v1/prospects
- GET /api/v1/prospects/{prospectId}
- PATCH /api/v1/prospects/{prospectId}
- POST /api/v1/prospects/{prospectId}/contact-attempts
- GET /api/v1/meetings
- POST /api/v1/meetings
- PATCH /api/v1/meetings/{meetingId}
- POST /api/v1/meetings/{meetingId}/confirm
- POST /api/v1/meetings/{meetingId}/cancel
- GET /api/v1/opportunities
- POST /api/v1/opportunities
- PATCH /api/v1/opportunities/{opportunityId}
- POST /api/v1/opportunities/{opportunityId}/products
- POST /api/v1/opportunities/{opportunityId}/stage-transition
- POST /api/v1/sales/orders
- GET /api/v1/sales/orders/{orderId}
- GET /api/v1/sales/reports/funnel

Database tables to trace in requirement mapping:

- prospects
- prospect_status_history
- meetings
- meeting_events
- products
- opportunities
- opportunity_products
- sales_orders
- sales_order_items
- stage_transitions

## 9. Prioritization Method

Use MoSCoW:

- Must: auth, phone CRUD, CNPJ enrichment, consent enforcement
- Should: timeline visualization, advanced filters, export
- Could: additional social providers, configurable confidence rules
- Won't (v1): autonomous call campaign engine at scale

## 10. Traceability Model

Use an ID-based matrix linking:

- Requirement ID -> Source (interview/workshop/doc)
- Requirement ID -> User story/task
- Requirement ID -> Test case(s)
- Requirement ID -> Release decision

Template columns:

- Req ID
- Type (RF or RNF)
- Source
- Priority
- Owner
- Acceptance Test ID
- Status

## 11. Risks and Mitigations

- Ambiguous requirements -> run validation workshop before freeze
- Scope creep -> hard baseline with change log and impact review
- Provider instability -> fallback + cache + retry policy
- Compliance uncertainty -> explicit legal checklist per outreach feature

## 12. Schedule to Delivery (2026-04-28)

- 2026-04-14 to 2026-04-17: elicitation and source consolidation
- 2026-04-18 to 2026-04-21: draft RF, RNF, and business rules
- 2026-04-22 to 2026-04-24: acceptance criteria and traceability matrix
- 2026-04-25 to 2026-04-26: stakeholder review and prioritization workshop
- 2026-04-27: final QA of document consistency
- 2026-04-28: final submission

## 13. Definition of Done for DRS

- All requirements have unique IDs
- Every requirement has acceptance criteria
- Every requirement is prioritized
- Traceability matrix is complete
- Scope boundaries are explicit
- Stakeholders validated the final draft
