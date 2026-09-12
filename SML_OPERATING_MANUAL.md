# 📋 SML Operating Manual
## Self-Made Legends Life & Legacy Insurance Co. — Daily Operations Guide

**Last Updated:** 2026-09-12  
**Status:** PRODUCTION READY  
**Scope:** Complete operational procedures for all departments

---

## Table of Contents

1. [Company Operations Overview](#1-company-operations-overview)
2. [Daily Operational Workflow](#2-daily-operational-workflow)
3. [Lead Intake & Processing](#3-lead-intake--processing)
4. [Quote Processing](#4-quote-processing)
5. [Underwriting Workflow](#5-underwriting-workflow)
6. [Claims Intake & Processing](#6-claims-intake--processing)
7. [Fraud Review Process](#7-fraud-review-process)
8. [Compliance Monitoring](#8-compliance-monitoring)
9. [Customer Support Operations](#9-customer-support-operations)
10. [Partner Communication](#10-partner-communication)
11. [Data Flow & Storage](#11-data-flow--storage)
12. [Motherboard AI Operations](#12-motherboard-ai-operations)
13. [Deployment & Updates](#13-deployment--updates)
14. [Reporting & Analytics](#14-reporting--analytics)

---

## 1. Company Operations Overview

### 1.1 Core Business Model
Self-Made Legends is a **digital-first Final Expense insurance platform** powered by AI-assisted workflows. The company:
- Collects customer information through digital channels (website, bots, partners)
- Analyzes customer data through AI bots
- Recommends approvals to insurance carriers
- Earns commissions when policies are issued
- Operates with human oversight at every critical decision point

### 1.2 Operational Philosophy
**"AI-Assisted, Human-Verified, Customer-Centered"**

- **AI-Assisted:** Bots handle initial intake, analysis, and recommendations
- **Human-Verified:** Humans review all critical decisions before customer communication
- **Customer-Centered:** Every process designed to reduce friction and serve customer needs

### 1.3 Core Operating Principle
**The Motherboard stores rules; the Bots analyze data; the Humans decide.**

No bot makes final decisions. All bots log recommendations to the Motherboard. All humans review bot recommendations before proceeding.

---

## 2. Daily Operational Workflow

### 2.1 Timeline of a Typical Day

#### **08:00 AM - Operations Team Arrives**
- Check overnight logs for any issues
- Review critical alerts (high fraud flags, system errors)
- Prepare daily dashboard for operations review

#### **09:00 AM - Morning Standup**
- Review overnight quote submissions
- Identify any blocked applications
- Assign tasks for the day

#### **09:30 AM - Ongoing Operations Begin**

**All Day (Concurrent Activities):**

**Stream 1: Lead Intake**
- Website visitors → Agent Bot → Quote submission
- Lead forms submitted
- Email inquiries received
- Partner referrals processed

**Stream 2: Quote Processing**
- Incoming quotes routed to Underwriting Bot
- Risk scores calculated
- Customer profiles created
- Recommendations generated

**Stream 3: Underwriting Review**
- Operations team reviews Underwriting Bot recommendations
- Edge cases flagged for deeper analysis
- Approval packages prepared for carriers
- Customers notified of next steps

**Stream 4: Compliance Monitoring**
- Compliance Bot monitors all bot communications
- Website content reviewed
- Partner communications checked
- Violations flagged for correction

**Stream 5: Customer Support**
- Inbound customer inquiries responded to
- Status updates provided
- Questions answered
- Issues escalated as needed

**Stream 6: Partner Management**
- Funeral home partners provided lead reports
- Carrier partners updated on submission status
- Partnership agreements managed
- Payments processed

#### **12:00 PM - Midday Review**
- Morning submissions reviewed
- Any urgent issues addressed
- Team sync on daily progress

#### **03:00 PM - Afternoon Review**
- Critical alerts checked
- High-value submissions flagged
- Compliance issues addressed
- Customer escalations reviewed

#### **05:00 PM - End-of-Day Preparation**
- Open items assigned for next day
- Critical alerts documented
- Daily summary initiated

#### **06:00 PM - Daily Summary Generated**
- System automatically generates daily report
- Lead counts and status tracked
- Bot performance logged
- Compliance checks documented

#### **After Hours - Monitoring**
- System continues to accept submissions
- Critical alerts trigger immediate notification
- Overnight team monitoring (if applicable)

### 2.2 Decision Flow at Each Stage

```
Customer Submits Quote
    ↓
Agent Bot/Form validates data
    ↓
Data stored in Backend
    ↓
Underwriting Bot analyzes
    ↓
Motherboard checks guardrails
    ↓
Recommendation generated
    ↓
Human agent reviews
    ↓
Customer notified
    ↓
Carrier receives application
    ↓
Carrier makes final decision
    ↓
Policy issued or declined
```

---

## 3. Lead Intake & Processing

### 3.1 Lead Sources

#### Source 1: Website Quote Form
- Customer fills 6-question form
- Form validates data before submission
- Data immediately stored in backend
- Assigned to next available underwriter

#### Source 2: Agent Bot Chat
- Customer interacts with Agent Bot
- Bot asks 6 qualifying questions
- Bot explains SML process
- Customer data collected and formatted
- Stored as structured JSON

#### Source 3: Funeral Home Partners
- Family scans QR code at funeral home
- QR links directly to quote form
- Same 6-question process
- Funeral home tracked as lead source
- Special handling for funeral home data

#### Source 4: Direct Email/Phone
- Customer emails info@selfmadelegends.com
- Customer calls partner phone number
- Agent manually inputs data
- Treated same as form submissions
- Documented in CRM

#### Source 5: Referral Partners
- Community organizations refer customers
- Referred customers link to quote
- Partner information captured
- Commission tracking enabled

### 3.2 Lead Intake Workflow

**Step 1: Data Collection**
- Customer provides information through preferred channel
- Agent Bot or form validates input
- All 6 required fields collected:
  1. Age (validated 40-85)
  2. Gender
  3. Smoking status
  4. Health conditions
  5. Desired coverage ($5K-$25K)
  6. Contact info (name, email, phone)

**Step 2: Immediate Storage**
- Data stored in JSON format with timestamp
- Lead assigned unique ID: `lead_[timestamp]_[random]`
- Source funnel tagged for tracking
- Status set to "new_submission"

**Step 3: Initial Validation**
- Motherboard checks basic guardrails
- Age within acceptable range? ✓
- Coverage amount within policy limits? ✓
- Contact info complete? ✓
- No immediate red flags? ✓

**Step 4: Bot Analysis**
- Underwriting Bot receives lead
- Risk score calculated (0-100)
- Recommendation generated
- Logged to AI_Logs dataset

**Step 5: Human Review**
- Operations agent pulls up lead
- Reviews bot recommendation
- Reviews original customer data
- Checks for data quality or concerns

**Step 6: Customer Contact**
- Agent reaches out to customer
- Explains next steps
- Answers initial questions
- Confirms interest in proceeding

**Step 7: Status Update**
- Lead status updated in backend
- "Pending review" → "Under underwriting"
- All interactions logged
- Next action documented

### 3.3 Lead Intake Performance Standards

**Response Time Targets:**
- Website submission acknowledgment: Within 1 hour
- Email inquiry response: Within 2 business hours
- Phone inquiry response: Within 1 hour
- Customer contact attempt: Within 24 hours

**Quality Standards:**
- All required data fields captured ✓
- Data validation passed ✓
- No duplicate submissions ✓
- Accurate contact information ✓
- Correct lead source tagged ✓

---

## 4. Quote Processing

### 4.1 Quote Processing Workflow

**Incoming Quote** (From customer through Agent Bot, form, or partner)
    ↓
**Data Validation** (Check all 6 fields are present and valid)
    ↓
**Motherboard Check** (Age 40-85? Coverage $5K-$25K? All guardrails passed?)
    ↓
**Underwriting Bot Analysis** (Calculate risk score, generate recommendation)
    ↓
**Human Agent Review** (Confirm bot analysis, review any concerns)
    ↓
**Customer Notification** (Email/call with next steps)
    ↓
**Carrier Submission** (Package sent to partner carrier)
    ↓
**Carrier Underwriting** (Carrier makes final decision)
    ↓
**Final Outcome** (Policy issued, pending more info, or declined)

### 4.2 Quote Tracking

Each quote is tracked through the system:

```json
{
  "lead_id": "lead_1694540400_a7x9k2",
  "status": "under_underwriting",
  "status_history": [
    {"status": "new_submission", "timestamp": "2026-09-12T14:30:00Z"},
    {"status": "bot_analyzed", "timestamp": "2026-09-12T14:31:00Z"},
    {"status": "under_underwriting", "timestamp": "2026-09-12T14:35:00Z"}
  ],
  "next_step": "Customer contact attempt",
  "assigned_to": "Agent Smith",
  "customer_contacted": false,
  "carrier_submitted": false
}
```

### 4.3 Quote-to-Carrier Handoff

Once quote is approved for submission:

**Step 1: Package Creation**
- Pull complete customer data
- Attach Underwriting Bot analysis
- Attach any supporting documents
- Create carrier-specific format

**Step 2: Compliance Check**
- Compliance Bot reviews package
- All required disclaimers included? ✓
- Customer data accurate? ✓
- No prohibited language? ✓
- Privacy compliance verified? ✓

**Step 3: Carrier Selection**
- Determine best carrier for customer profile
- Match risk score to carrier's underwriting appetite
- Check carrier capacity
- Confirm partnership terms

**Step 4: Submission**
- Send package to carrier's system
- Log submission time and carrier
- Track submission ID
- Request confirmation receipt

**Step 5: Tracking**
- Monitor for carrier response
- Follow up if no response in 5 business days
- Update customer on status
- Log all communication

---

## 5. Underwriting Workflow

### 5.1 Underwriting Process

The Underwriting Bot performs initial analysis; human agents make final decisions.

**Input:** Customer quote data with 6 fields

**Process:**
1. **Risk Score Calculation** (0-100)
   - Age factor (younger = lower risk)
   - Health condition severity
   - Smoking status (adds 20-40 points)
   - Coverage relative to age/health
   - Combine into single score

2. **Guardrail Check**
   - Compare score against Motherboard rules
   - Check for any absolute contraindications
   - Verify all data is present and valid
   - Flag any concerns

3. **Recommendation Generation**
   - Score 0-30: "Approve immediately"
   - Score 31-60: "Approve with standard conditions"
   - Score 61-80: "Request human review"
   - Score 81-100: "Request detailed manual underwriting"

4. **Output to Log**
   - Document all analysis
   - Timestamp recommendation
   - Log confidence level (0-100%)
   - Flag any edge cases

### 5.2 Human Agent Underwriting Review

Agent receives Underwriting Bot recommendation and:

**Step 1: Data Review**
- Read original customer submission
- Verify all information is accurate
- Check for any data quality issues
- Identify any concerns bot might have missed

**Step 2: Bot Recommendation Review**
- Read Underwriting Bot analysis
- Review risk score calculation
- Verify recommendation matches score
- Check if any guardrails triggered

**Step 3: Decision**
- **For scores 0-60:** Typically approve (unless data quality issue)
- **For scores 61-80:** Conduct deeper analysis, request more info if needed
- **For scores 81-100:** Request detailed manual underwriting or get manager approval

**Step 4: Customer Communication**
- If approving for carrier submission:
  - Email/call customer with update
  - Explain what happens next
  - Provide carrier name and process
  - Answer any questions

- If requesting more information:
  - Explain what additional info needed
  - Provide clear instructions
  - Set timeline for response
  - Offer to help clarify

**Step 5: Carrier Submission or Escalation**
- If approved: Submit to carrier immediately
- If pending info: Hold and follow up
- If concerning: Escalate to manager

### 5.3 Underwriting Guardrails (From Motherboard)

All underwriting must comply with:

✅ **Allowed Coverage Amounts:** $5,000 - $25,000  
✅ **Allowed Ages:** 40 - 85  
✅ **Required Data:** All 6 fields present and valid  
✅ **Documented Health Conditions:** Only accept listed conditions  
✅ **Carrier Rules:** Follow each carrier's specific underwriting appetite  

❌ **Not Allowed:** Medical judgments, medical advice, denials based on discrimination, guarantees of approval  

---

## 6. Claims Intake & Processing

### 6.1 Claims Workflow

Claims are handled with **compassion, accuracy, and speed** at a critical moment for grieving families.

**Inbound Claim** (Phone, email, or Claims Bot)
    ↓
**Initial Intake** (Gather basic info: policy #, date of death)
    ↓
**Claims Bot Assistance** (Collect required documentation)
    ↓
**Documentation Review** (Verify all docs received)
    ↓
**Carrier Coordination** (Send to carrier for processing)
    ↓
**Follow-up** (Track status, keep family updated)
    ↓
**Settlement** (Carrier issues payment)

### 6.2 Claims Intake Steps

**Step 1: Initial Contact**
- Family calls or emails to file claim
- Agent listens compassionately
- Get basic information:
  - Deceased name
  - Policy number (if available)
  - Date of death
  - Beneficiary contact info

**Step 2: Claims Bot Assistance**
- Route to Claims Bot for documentation collection
- Bot explains required documents:
  - Certified death certificate
  - Policy documents
  - Claim form (complete)
  - Beneficiary proof of relationship
  - Funeral expense documentation (if needed)

**Step 3: Documentation Gathering**
- Claims Bot provides clear instructions
- Family submits documents
- Verify completeness:
  - All documents received? ✓
  - Quality readable? ✓
  - Forms properly completed? ✓
  - No missing signatures? ✓

**Step 4: Human Agent Review**
- Agent reviews complete claim package
- Check for any issues or concerns
- Flag missing information
- Organize documents for carrier

**Step 5: Carrier Submission**
- Submit complete package to carrier
- Include summary of documents
- Note any special circumstances
- Request timeline for review

**Step 6: Follow-up & Communication**
- Log submission date and carrier
- Schedule follow-up check-in
- Keep family informed of status
- Be available to answer questions

### 6.3 Claims Performance Standards

**Response Time Targets:**
- Initial acknowledgment: Same day
- Claims Bot setup: Within 2 hours
- Documentation review: Within 24 hours
- Carrier submission: Within 3 business days
- Status updates to family: Weekly during processing

**Compassion Standards:**
- Treat family with respect and empathy
- Use clear, simple language
- Don't mention legal/financial details
- Offer support and resources
- Document all communications

---

## 7. Fraud Review Process

### 7.1 Fraud Detection & Escalation

The Fraud Bot automatically flags suspicious patterns. Humans investigate and make final determinations.

**Fraud Risk Indicators (Motherboard Rules):**
- Multiple applications from same person (different info)
- Age/health mismatches (e.g., 25-year-old with cancer)
- Coverage amount suspicious for age/health
- False information markers detected
- Claim filed within days of policy issue
- Premium details mismatched with policy

### 7.2 Fraud Review Workflow

**Fraud Flag Detected** (By Fraud Bot)
    ↓
**Risk Score Generated** (0-100, higher = more suspicious)
    ↓
**Escalation to Fraud Analyst** (Auto-assigned)
    ↓
**Investigation** (Review full application, cross-check data)
    ↓
**Determination** (Suspicious, Likely fraudulent, or Clear)
    ↓
**Action** (Proceed normally, escalate, or decline)
    ↓
**Documentation** (Log decision and reasoning)

### 7.3 Fraud Analyst Responsibilities

When fraud is flagged:

**Step 1: Case Assignment**
- Fraud analyst receives flag
- Reviews Fraud Bot analysis
- Reads original application
- Assesses risk level

**Step 2: Investigation**
- Check for duplicate applications (same person)
- Verify age is reasonable for health conditions stated
- Cross-reference with public records if needed
- Look for patterns from same address/phone

**Step 3: Determination**
- **Likely Fraudulent:** Clear false information or red flags
  - Action: Decline and escalate to management + legal
  
- **Suspicious:** Some concerns but not conclusive
  - Action: Request verification from customer, escalate to manager
  
- **Clear:** No fraud concerns identified
  - Action: Proceed normally with underwriting

**Step 4: Action & Documentation**
- Document all findings
- Record decision and reasoning
- Update lead status in backend
- Notify manager if fraudulent
- Communicate to customer if verification needed

### 7.4 Fraud Escalation

**If Likely Fraudulent:**
1. Immediately notify manager
2. Document all evidence
3. Notify legal team
4. Consider reporting to authorities
5. Decline application with appropriate notice
6. Log in compliance records

**If Suspicious but Unclear:**
1. Request additional verification from customer
2. Document request and response
3. Re-evaluate after receiving info
4. Consult with manager if still unclear
5. Document final determination

---

## 8. Compliance Monitoring

### 8.1 Continuous Compliance

The Compliance Bot monitors ALL customer-facing communications to ensure regulatory and brand compliance.

**What's Monitored:**
- All bot communications with customers
- All email templates
- All website content
- All partner communications
- All marketing materials
- All agreements and terms

### 8.2 Compliance Check Process

**Compliance Bot Daily Review:**

```
All Content Generated Today
    ↓
Check against Motherboard rules:
  ✓ No prohibited phrases?
  ✓ Required disclaimers included?
  ✓ Tone appropriate?
  ✓ Legal requirements met?
  ✓ Data handling compliant?
    ↓
Issues Found?
    ├─ NO → Approve content
    └─ YES → Flag for review
              ↓
         Compliance team reviews
         Makes correction
         Re-approves content
```

### 8.3 Prohibited Content (Compliance Rules)

**Bots and agents CANNOT say:**
❌ "We guarantee approval"  
❌ "Everyone gets approved"  
❌ "You definitely won't be denied"  
❌ "We can promise this rate"  
❌ "Our insurance is the best deal"  
❌ "We never deny claims"  
❌ "Don't worry, this is definitely covered"  
❌ "No insurance company will compete with us"  

**Bots and agents MUST say (as applicable):**
✅ "SML provides quotes; licensed carriers issue policies"  
✅ "Your approval and pricing will be determined by our partner carrier"  
✅ "I can't guarantee approval, but I can help you understand the process"  
✅ "All information must be accurate and complete"  

### 8.4 Required Disclaimers

Every customer-facing communication must include:

**Minimum Disclaimer:**
```
SML provides free quotes as a convenience.
SML does not issue insurance policies.
Licensed insurance carriers underwrite and issue all policies.
Your quote does not guarantee policy approval or specific pricing.
```

**Full Disclaimer (on quote pages):**
```
⚠️ IMPORTANT DISCLOSURES:
• SML provides free quotes as a convenience
• SML does not issue insurance policies
• Licensed insurance carriers underwrite and issue all policies
• Your quote does not guarantee policy approval
• Final pricing is determined by the carrier's underwriting
• All information you provide must be accurate and complete
• See our Privacy Policy and Terms & Conditions
```

### 8.5 Compliance Violations

If violation detected:

**Step 1: Alert**
- Compliance Bot flags violation immediately
- Escalates to compliance team
- Documents exact violation

**Step 2: Review**
- Compliance manager reviews flag
- Determines severity:
  - **Minor:** (Tone issue, formatting) → Correct and resubmit
  - **Moderate:** (Missing disclaimer) → Correct and notify
  - **Severe:** (Prohibited phrase) → Correct, notify, and investigate

**Step 3: Correction**
- Remove or revise problematic content
- Add required disclaimers
- Ensure guardrails met
- Re-submit for approval

**Step 4: Investigation**
- For severe violations: Investigate how it happened
- Retrain bot or agent if needed
- Update rules if necessary
- Document incident

**Step 5: Documentation**
- Log all violations in compliance records
- Include date, content, violation type, correction
- Keep for audit purposes (7 years minimum)

---

## 9. Customer Support Operations

### 9.1 Customer Support Channels

Customers can reach SML through:

**Channel 1: Website Chat**
- Customer Service Bot available 24/7
- Handles FAQs, status inquiries
- Escalates complex issues to human

**Channel 2: Email**
- Email to support@selfmadelegends.com
- Response within 2 business hours
- Agent reads and responds personally

**Channel 3: Phone**
- Direct phone line (if available)
- Live agent answers
- Takes notes and follows up

**Channel 4: Contact Form**
- Website contact form
- Sent to support queue
- Agent responds within 24 hours

### 9.2 Customer Service Workflow

**Inbound Inquiry** (Chat, email, phone, or form)
    ↓
**Triage by Type:**
  ├─ FAQ/Simple question → Customer Service Bot
  ├─ Quote status → Human agent (check backend)
  ├─ Claims inquiry → Claims specialist
  ├─ Technical issue → Technical support
  └─ Complaint → Manager
    ↓
**Response** (Provide clear, compassionate answer)
    ↓
**Resolution** (Answer provided or escalated)
    ↓
**Follow-up** (Ensure satisfaction)

### 9.3 Customer Service Standards

**Responsiveness:**
- Chat responses: Within 5 minutes during business hours
- Email responses: Within 2 business hours
- Phone responses: Answer before 4th ring
- Form submissions: Response within 24 hours

**Tone:**
- Warm and empathetic
- Clear and simple language
- Respectful and professional
- Solution-focused

**Knowledge:**
- Familiar with all 12 website pages
- Understand the quote process
- Able to check application status
- Know when to escalate

**Documentation:**
- Log all interactions in CRM
- Record issue and resolution
- Note customer satisfaction
- Flag trends for improvement

### 9.4 Escalation Process

**When to escalate:**
- Customer expresses frustration → Manager
- Technical issues → Tech support
- Claims questions → Claims specialist
- Complex product questions → Manager/Specialist
- Complaints → Manager

**Escalation steps:**
1. Acknowledge customer issue
2. Apologize if applicable
3. Explain what you're doing
4. Transfer to right person
5. Ensure seamless handoff

---

## 10. Partner Communication

### 10.1 Partner Types & Communication

**Partner Type 1: Funeral Homes**
- Communicate lead volume weekly
- Provide QR code for quote collection
- Share leads generated from their referrals
- Process payments/commissions monthly
- Annual review and optimization

**Partner Type 2: Insurance Carriers**
- Share applicant submissions daily
- Provide status updates on pending applications
- Report policy issue rates and commissions
- Quarterly business reviews
- Annual partnership goals

**Partner Type 3: Community Partners**
- Share referral opportunities
- Provide marketing materials
- Track referrals and commissions
- Monthly communication on results
- Annual partnership assessment

### 10.2 Funeral Home Partner Workflow

**Onboarding:**
1. Partner requests SML partnership
2. Send partnership agreement
3. Explain QR code system
4. Provide marketing materials
5. Train on quote process
6. Activate partnership

**Ongoing:**
- Weekly lead report (how many referred)
- Commission tracking (payments due)
- Performance dashboard (real-time stats)
- Marketing support (new materials, training)

**Support:**
- Dedicated partner manager
- Quick response to questions
- Regular check-ins
- Problem resolution

**Reporting:**
- Weekly: # of leads referred, status of applications
- Monthly: Commissions earned, payments processed
- Quarterly: Performance review, optimization discussion
- Annual: Contract renewal, growth planning

### 10.3 Carrier Partner Workflow

**Submission Process:**
1. Receive customer application from SML
2. SML submits via partner's preferred method (API, email, portal)
3. Include complete customer data + Underwriting Bot analysis
4. Include compliance check (all disclaimers met)
5. Request timeline for review

**Status Tracking:**
- Carrier provides status updates
- SML tracks policy issue rate
- Monitor for performance issues
- Escalate delays

**Reporting:**
- Daily: # applications submitted
- Weekly: # policies issued, # declined, # pending
- Monthly: Commissions earned, payments processed
- Quarterly: Performance review, volume growth
- Annual: Contract review, volume targets, expansion

---

## 11. Data Flow & Storage

### 11.1 Customer Data Journey

```
Customer Input (Quote Form/Bot)
    ↓
Data Validation (Check all fields present/valid)
    ↓
Backend Storage (JSON file created)
    ↓
Motherboard Check (Guardrails verification)
    ↓
Underwriting Bot Analysis (Risk scoring)
    ↓
Human Agent Review (Confirm recommendation)
    ↓
Carrier Submission (Package sent)
    ↓
Carrier Underwriting (Carrier makes decision)
    ↓
Policy Issued or Declined
    ↓
Data Archived (Retained 7 years for compliance)
```

### 11.2 Data Storage Structure

**Individual Lead Files:**
- Location: `/SML_Final_Expense_Leads/leads/`
- Naming: `lead_[timestamp]_[random].json`
- Contains: Customer data, bot logs, status history
- Updated: Throughout lead lifecycle
- Never deleted (retention policy)

**Daily Aggregates:**
- Location: `/SML_Final_Expense_Leads/summaries/`
- Naming: `summary_[YYYY-MM-DD].json`
- Generated: Automatically at midnight UTC
- Contains: Lead counts, status breakdown, trends

**Bot Activity Logs:**
- Location: `/SML_Final_Expense_Leads/logs/`
- Naming: `SML_AI_Logs_[YYYY-MM-DD].json`
- Generated: Continuously throughout day
- Contains: All bot interactions, decisions, timestamps

### 11.3 Data Handling Rules

**Privacy:**
- Customer data never shared without consent
- Data never sold to third parties
- Access restricted to authorized employees
- Encrypted at rest and in transit

**Security:**
- All data encrypted (AES-256 or equivalent)
- Secure authentication required
- Access logging enabled
- Regular security audits

**Retention:**
- Customer records: 7 years (insurance compliance)
- Bot logs: 3 years (operational improvement)
- Summary data: Indefinitely
- Deletion: Only by legal request

**Compliance:**
- Data handling meets CCPA, GDPR where applicable
- Privacy policy explains data usage
- Terms & Conditions include data agreement
- Audit trail maintained

---

## 12. Motherboard AI Operations

### 12.1 Motherboard Responsibilities

The Motherboard is the **central rules engine** for SML. It:

**Stores Rules:**
- Underwriting eligibility criteria
- Risk scoring methodology
- Compliance requirements
- Product definitions
- Fraud patterns

**Receives Logs:**
- All bot interactions
- All decisions made
- All timestamps and results
- All exceptions and errors

**Analyzes Patterns:**
- Identify trends in applications
- Detect bot performance issues
- Spot compliance violations
- Flag emerging fraud patterns

**Suggests Improvements:**
- Recommend rule changes
- Suggest bot improvements
- Identify process bottlenecks
- Propose efficiency gains

### 12.2 Motherboard Daily Operations

**Morning (Startup):**
- Load all rules from rule database
- Load overnight logs from bots
- Initialize guardrail checks
- Verify system health

**Throughout Day:**
- Monitor all bot requests
- Check against guardrails
- Log all interactions
- Flag any violations

**Evening (Daily Review):**
- Compile all bot logs
- Analyze daily patterns
- Generate performance report
- Identify issues or trends

**Night (Aggregation):**
- Prepare daily summary
- Archive old logs
- Prepare next day's rules
- Alert on critical issues

### 12.3 Motherboard Rule Categories

**Category 1: Underwriting Rules**
```json
{
  "rules": {
    "min_age": 40,
    "max_age": 85,
    "min_coverage": 5000,
    "max_coverage": 25000,
    "health_conditions": [
      "Diabetes",
      "Hypertension",
      "Heart Disease",
      "Cancer",
      "Other"
    ]
  }
}
```

**Category 2: Risk Scoring Rules**
```json
{
  "scoring": {
    "age_factor": "0.5 points per year over 40",
    "smoking_factor": "20-40 points added",
    "health_conditions": {
      "diabetes": 15,
      "hypertension": 12,
      "cancer": 25
    }
  }
}
```

**Category 3: Compliance Rules**
```json
{
  "compliance": {
    "prohibited_phrases": [
      "We guarantee approval",
      "Everyone gets approved",
      "Best deal guaranteed"
    ],
    "required_phrases": [
      "SML provides quotes; carriers issue policies",
      "Cannot guarantee approval"
    ]
  }
}
```

**Category 4: Fraud Patterns**
```json
{
  "fraud_patterns": {
    "multiple_applications": "high_risk",
    "age_health_mismatch": "medium_risk",
    "claim_soon_after_issue": "high_risk"
  }
}
```

### 12.4 Motherboard Output Example

When bot requests guardrail check:

```json
{
  "request": {
    "bot": "Underwriting Bot",
    "applicant_age": 65,
    "health_conditions": ["Diabetes", "Hypertension"],
    "coverage_amount": 15000,
    "risk_score": 58
  },
  "analysis": {
    "age_valid": true,
    "coverage_valid": true,
    "conditions_known": true,
    "risk_score_reasonable": true,
    "all_guardrails_passed": true
  },
  "recommendation": "Proceed with carrier submission",
  "confidence": 0.94,
  "timestamp": "2026-09-12T14:35:00Z"
}
```

---

## 13. Deployment & Updates

### 13.1 GitHub Workflow for Updates

All changes to website, bots, backend, or processes go through GitHub workflow:

**Step 1: Create Feature Branch**
```bash
git checkout -b feature/name-of-feature
```

**Step 2: Make Changes**
- Update code, content, or configuration
- Test locally before pushing

**Step 3: Commit Changes**
```bash
git add .
git commit -m "Add [feature name]"
git push origin feature/name-of-feature
```

**Step 4: Open Pull Request**
- Describe changes clearly
- Explain why change was needed
- Specify testing done

**Step 5: Code Review**
- Peer review all changes
- Verify testing completed
- Check compliance bot review
- Ensure no quality issues

**Step 6: Approval & Merge**
- Require 1+ approvals
- All checks passing
- No conflicts with main
- Merge to main branch

**Step 7: Deployment**
- CI/CD pipeline auto-deploys
- Frontend: Deploy to Vercel
- Backend: Deploy to Railway
- Verify in production

### 13.2 Types of Changes

**Website Changes (frontend/)**
- New pages, updated content
- Design changes, styling updates
- Feature additions, bug fixes
- Example: Add new testimonials, update footer

**Bot Changes (ai-bots/)**
- Bot logic updates
- Conversation flow changes
- Motherboard rule updates
- Example: Update Agent Bot questions, adjust fraud detection

**Backend Changes (backend/)**
- Data storage updates
- API endpoint changes
- Daily summary improvements
- Example: Add new data field, improve performance

**Documentation Changes (docs/ or root)**
- Update operating manual
- Revise compliance rules
- Improve training materials
- Example: Update SML_OPERATING_MANUAL.md

### 13.3 Deployment Safety

**Before Deployment:**
- ✓ All tests passing
- ✓ Code review approved
- ✓ Compliance bot approval
- ✓ No sensitive data exposed
- ✓ Performance verified
- ✓ Backwards compatibility checked

**During Deployment:**
- ✓ Monitor for errors
- ✓ Check system performance
- ✓ Verify all changes live
- ✓ Monitor customer-facing impact

**After Deployment:**
- ✓ Verify all features working
- ✓ Check for performance issues
- ✓ Monitor error logs
- ✓ Follow up on any bugs

### 13.4 Rollback Procedure

If deployment causes issues:

**Step 1: Identify Issue**
- Error reported
- Bug discovered
- Performance problem

**Step 2: Assess Severity**
- Critical (affects customers): Immediate rollback
- Major (affects functionality): Rollback within 1 hour
- Minor (cosmetic issue): Fix forward if possible

**Step 3: Rollback**
```bash
git revert [commit-hash]
git push origin main
# Vercel/Railway auto-redeploy
```

**Step 4: Investigation**
- Determine what went wrong
- Fix root cause
- Test thoroughly
- Re-deploy when ready

**Step 5: Communication**
- Notify affected customers
- Explain issue
- Provide update timeline
- Apologize if appropriate

---

## 14. Reporting & Analytics

### 14.1 Daily Reports

**Daily Summary Report** (Generated automatically at 6 PM UTC)

```json
{
  "date": "2026-09-12",
  "total_leads": 47,
  "by_source": {
    "quote_funnel": 28,
    "funeral_home": 12,
    "referral": 5,
    "direct": 2
  },
  "by_status": {
    "pending_review": 20,
    "under_underwriting": 15,
    "approved": 8,
    "declined": 4
  },
  "demographics": {
    "average_age": 58.3,
    "male_percent": 42,
    "female_percent": 58,
    "smokers_percent": 28
  },
  "health_conditions": {
    "diabetes": 18,
    "hypertension": 22,
    "no_conditions": 7
  },
  "average_coverage_requested": 14200,
  "compliance_issues": 0,
  "fraud_flags": 2
}
```

### 14.2 Weekly Report (Operations Review)

**Contents:**
- Lead volume comparison (week vs. prior week)
- Quote-to-approval rate
- Average processing time per stage
- Partner performance (funeral homes, carriers)
- Compliance violations (if any)
- Fraud alerts and outcomes
- Customer satisfaction feedback
- System performance metrics

### 14.3 Monthly Report (Management Review)

**Contents:**
- Lead volume trends
- Revenue impact (estimated commissions)
- Partner performance rankings
- Customer satisfaction scores
- Compliance audit results
- Bot performance metrics
- Team productivity analysis
- Strategic initiatives progress

### 14.4 Quarterly Report (Leadership Review)

**Contents:**
- Revenue earned vs. target
- Lead volume vs. goal
- Partner growth
- Market analysis
- Competitive positioning
- Strategic initiatives
- Challenges and solutions
- Next quarter outlook

---

## Conclusion

This Operating Manual defines how Self-Made Legends functions every day. Every team member should be familiar with these processes and standards. Questions should be escalated to management. Updates to this manual should be made through GitHub pull requests and merged by the operations manager.

**The Operating Manual is the source of truth for daily operations.**

---

**SML Operating Manual — Complete and Production Ready**

**Status:** ACTIVE  
**Last Updated:** 2026-09-12  

Built with clarity, compassion, and community. 🏆
