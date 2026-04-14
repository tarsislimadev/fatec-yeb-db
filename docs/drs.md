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
