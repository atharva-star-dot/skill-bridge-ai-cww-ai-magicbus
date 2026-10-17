<!--
# Sync Impact Report
- Version change: Uninitialized -> 1.0.0
- List of modified principles:
  - [PRINCIPLE_1_NAME] -> I. Rapid MVP with Proven Technology
  - [PRINCIPLE_2_NAME] -> II. Server-Side Structured AI with Zod Validation
  - [PRINCIPLE_3_NAME] -> III. Fault Isolation & Independent Features
  - [PRINCIPLE_4_NAME] -> IV. Mobile-First, Accessible & Resilient UX
  - [PRINCIPLE_5_NAME] -> V. Fast Manual Verifiability
  - Added principle: VI. Windows PowerShell & Platform Compatibility
- Added sections:
  - Technology Stack & Deployment Constraints
  - Development Workflow & Quality Gates
- Removed sections: None
- Follow-up TODOs: None (all placeholders resolved)
-->

# Skill Bridge AI Constitution

## Core Principles

### I. Rapid MVP with Proven Technology
The project MUST prioritize shipping a functioning Minimum Viable Product (MVP) quickly over speculative complexity. Developers MUST select simple, boring, and thoroughly documented technologies. Premature optimization, speculative architectural abstractions, and unproven third-party libraries are strictly prohibited.

### II. Server-Side Structured AI with Zod Validation
All AI capabilities MUST utilize the Google Gemini API executed strictly on the server side (via Next.js Route Handlers). Client-side exposure of API keys is strictly forbidden. Every AI response MUST produce structured JSON that is explicitly validated against a predefined Zod schema before consumption or rendering. Unvalidated AI payloads MUST NOT reach the client UI.

### III. Fault Isolation & Independent Features
Each feature and user workflow MUST function independently. The system MUST NOT introduce inter-feature tight coupling where an error or rate limit in one capability (e.g., resume parsing) breaks another (e.g., job exploration). The demonstration and core user journey MUST gracefully degrade so no demo ever depends on a single broken component.

### IV. Mobile-First, Accessible & Resilient UX
The user interface MUST be built mobile-first and meet standard accessibility criteria using Tailwind CSS and shadcn/ui. Every asynchronous data interaction or AI generation MUST provide explicit, visible loading, empty, and error states. Unhandled errors or silent screen freezes are non-negotiable defects.

### V. Fast Manual Verifiability
Every user story and functional requirement MUST include concrete acceptance criteria that can be tested and verified manually in under 60 seconds. Quality gates and code review require practical, rapid verification without complex, multi-minute local setups.

### VI. Windows PowerShell & Platform Compatibility
All developer automation, setup scripts, and command-line instructions MUST run seamlessly in Windows PowerShell. POSIX-only shell assumptions, non-portable bash scripts, or unverified platform binaries are disallowed. Documentation MUST explicitly guide Windows PowerShell execution.

## Technology Stack & Deployment Constraints

- **Frontend & App Framework**: Next.js (App Router) with TypeScript, Tailwind CSS, and shadcn/ui.
- **Backend Architecture**: Next.js App Router API Route Handlers (serverless runtime).
- **AI Integration**: Google Gemini API exclusively on the server side.
- **Data Persistence**: Supabase or SQLite for lightweight, reliable data management.
- **Infrastructure & Hosting**: Target production deployment MUST be Vercel with a publicly accessible live URL. Containerization (Docker) and AWS infrastructure are explicitly out of scope for this MVP.
- **Secrets & Configuration**: All configuration and sensitive credentials MUST be loaded strictly via environment variables. Keys MUST NEVER be committed to source control. A complete and descriptive `.env.example` file MUST be maintained in the project root.

## Development Workflow & Quality Gates

- **Verification Standard**: Before a feature is merged or marked complete, it must be manually verified against its acceptance criteria in under one minute.
- **Resilience Testing**: When developing features backed by Gemini or external storage, developers MUST test failure handling (e.g., simulated network failure or malformed payload) to verify that error states render cleanly without breaking the surrounding application.
- **Scripting & Docs**: Any script added to `.specify/scripts` or documented in project guides MUST be authored and tested as a PowerShell script (`.ps1`).

## Governance

This Constitution represents the canonical engineering authority for Skill Bridge AI. All architecture plans, specifications, pull requests, and implementations MUST adhere to these rules. Amendments require updating this document, justifying changes, and incrementing the version in accordance with semantic versioning:
- **MAJOR**: Incompatible principle removals or foundational architecture shifts.
- **MINOR**: Adding new principles, sections, or materially expanding constraints.
- **PATCH**: Clarifications, non-semantic wording refinements, or typo fixes.

**Version**: 1.0.0 | **Ratified**: 2026-10-17 | **Last Amended**: 2026-10-17
