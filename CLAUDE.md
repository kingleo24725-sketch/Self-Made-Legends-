# Self-Made Legends Life & Legacy Insurance Co.

## Company Identity

**Name:** Self-Made Legends Life & Legacy Insurance Co. (SML)  
**Type:** Digital-first life insurance company  
**Mission:** Clarity, compassion, and community  
**Primary Product:** Final Expense Insurance  
**Brand Colors:** Black, Gold (#C9A227), White  
**Tagline:** "Protect what matters. Build your legacy."  
**Target Market:** Ages 40-85, underserved communities, families seeking affordable final expense coverage  
**Black-owned company** — community-first values are non-negotiable

## Repository Structure

### Core Documentation (SML_ prefix)

| File | Purpose |
|------|---------|
| `SML_MASTER_BLUEPRINT.md` | **The source of truth.** Company identity, AI ecosystem, business engine, backend system, compliance, website pages, GitHub workflow, revenue streams, vision. All other documents reference this. |
| `SML_OPERATING_MANUAL.md` | Daily operations, workflows, data flows, lead intake, quote processing, underwriting, claims, fraud review, compliance, customer support, deployment, reporting |
| `SML_BOT_PERSONALITY_SYSTEM.md` | How each of the 6 AI bots speaks: tone, guardrails, example dialogues |
| `SML_AGENT_TRAINING_MANUAL.md` | Human agent standards: brand, lead handling, quotes, applications, backend data, escalation, logging |
| `SML_COMPLIANCE_GUARDRAILS.md` | Legal and ethical standards. Prohibited language, required language, data protection, fraud procedures. **Security-critical.** |
| `SML_AGENT_CERTIFICATION_PROGRAM.md` | 8-module certification (14.5 hours). Levels: Basic, Senior, Team Lead |
| `SML_MARKETING_SYSTEM.md` | Acquisition and conversion: digital ads, landing pages, email/SMS sequences, social media, partnership funnels, analytics |
| `SML_EXPANSION_ROADMAP.md` | 5-year, 8-phase growth strategy. From single-product startup to $50M+ national ecosystem |
| `SML_MOBILE_APP_BLUEPRINT.md` | iOS/Android app spec: features, security, design system, technical architecture |
| `SML_AUTONOMOUS_UNDERWRITING_SYSTEM.md` | Risk analysis engine. 0-100 risk scoring, health condition analysis, fraud integration, JSON output, Motherboard logging |
| `SML_AUTONOMOUS_CLAIMS_SYSTEM.md` | Claims processing engine. 0-100 validation scoring, policy verification, fraud detection, payout workflow, beneficiary messaging |

### Website (HTML — root directory)

12 pages: `index.html`, `product-page.html`, `underwriting-form.html`, `agent-bot.html`, `about-founder.html`, `how-it-works.html`, `why-choose-us.html`, `faq.html`, `contact.html`, `partner-with-us.html`, `privacy-policy.html`, `terms-conditions.html`

### Backend

- **Runtime:** Node.js + Express (`server.js`, port 3000)
- **Lead Storage:** JSON files in `SML_Final_Expense_Leads/leads/`
- **Daily Summaries:** `SML_Final_Expense_Leads/summaries/`
- **Dependencies:** express, cors (see `package.json`)

### Other Key Files

- `CONTRIBUTING.md` — contribution guidelines
- `PR_REVIEW_CHECKLIST.md` — pull request review standards
- `DEPLOYMENT_GUIDE.md` — deployment procedures
- `OPERATIONS.md` — operational runbooks
- `PRICING.md` — pricing logic and guidelines
- `BACKEND_README.md` — backend API documentation
- `email-templates.md` — outreach email templates
- `partnership-scripts.md` — partnership outreach scripts
- `partnership-tracking-guide.md` — partner relationship tracking
- `.github/pull_request_template.md` — PR template
- `.github/ISSUE_TEMPLATE/` — issue templates

## AI Ecosystem Architecture

### Motherboard AI (Central Rules Engine)

The Motherboard stores all SML business logic:
- Underwriting rules, compliance guardrails, fraud patterns, product definitions
- All child bots query the Motherboard before acting
- Logs every bot output for pattern analysis and continuous improvement
- Generates improvement suggestions for leadership review

### Child Bots (6 Specialized Agents)

| Bot | Role | Tone |
|-----|------|------|
| **Agent Bot** | Lead intake, quote generation, customer conversation | Warm, clear, friendly |
| **Underwriting Bot** | Risk analysis, scoring, recommendations | Analytical, neutral, precise |
| **Claims Bot** | Claims processing, beneficiary support | Compassionate, calm, supportive |
| **Fraud Bot** | Fraud detection, pattern recognition | Sharp, observant, vigilant |
| **Compliance Bot** | Guardrail enforcement, regulatory monitoring | Strict, formal, rule-driven |
| **Customer Service Bot** | Ongoing support, questions, status updates | Friendly, patient, helpful |

### Critical AI Rules

- Bots **NEVER** promise approval, deny coverage, or quote final pricing
- Bots **NEVER** provide medical, legal, or financial advice
- Bots **ALWAYS** log outputs to Motherboard
- Bots **ALWAYS** escalate when uncertain
- The Underwriting and Claims systems generate **recommendations only** — humans make final decisions

## Compliance — Non-Negotiable

Agents and bots CANNOT:
- Promise approval or specific pricing
- Provide medical, legal, or financial advice
- Misrepresent coverage terms or benefits
- Discriminate based on protected characteristics
- Share customer data without authorization
- Skip compliance checks or Motherboard logging

When in doubt: **escalate, don't guess.**

## Data & Storage Conventions

- **Lead data:** JSON, stored per submission + daily aggregates
- **Underwriting output:** JSON, 7-year retention, stored in `/data/underwriting/analyses/`
- **Claims output:** JSON, 10-year retention, stored in `/data/claims/analyses/`
- **Bot logs:** JSON, per interaction, aggregated daily
- **All sensitive data:** encrypted at rest and in transit

## Products

| Product | Coverage | Ages | Underwriting |
|---------|----------|------|-------------|
| Final Expense | $5K-$25K | 40-85 | Simplified |
| Term Life | $25K-$500K | 18-75 | Standard |
| Whole Life (Simplified) | $5K-$50K | 45-80 | Simplified |
| Accidental Death | $5K-$50K | 18-75 | Simplified |

## Risk Scoring (Underwriting)

- Scale: 0-100 (lower = lower risk)
- Green (0-25): Standard approval path
- Yellow (26-50): Standard review
- Orange (51-75): Detailed review required
- Red (76-100): Escalation required

## Claims Validation Scoring

- Scale: 0-100 (higher = stronger validity)
- Green (80-100): Standard processing
- Yellow (60-79): Items to verify
- Orange (40-59): Investigation needed
- Red (0-39): Escalation required

## Code & Workflow Conventions

- **Branch:** Development happens on feature branches, not main
- **Commits:** Descriptive messages explaining the "why"
- **Markdown docs:** SML_ prefix for core operational documents
- **HTML pages:** Root directory, mobile-responsive, black/gold/white brand
- **Backend:** Express.js, JSON file storage (no database yet)
- **No test suite configured** — `npm test` exits with error

## Expansion Phases (Roadmap)

1. **Launch** (Months 0-6): Final Expense platform + AI ecosystem
2. **Scale** (6-12): 10x growth, 20+ funeral home partnerships
3. **Diversify** (12-18): 3 new products, cross-sell model
4. **Distribute** (18-24): Licensed agent network
5. **Mobilize** (24-30): iOS/Android apps
6. **Expand** (30-42): National coverage, 50 states
7. **Invest** (36-48): Series A ($5-10M)
8. **Ecosystem** (48+): Multi-product, $50M+ revenue

## Key Contacts & Ownership

- **Owner/Founder:** Leo Brown (leobrown24725@yahoo.com)
- **GitHub:** kingleo24725-sketch/Self-Made-Legends-
