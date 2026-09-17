# 🏛️ SML Autonomous Underwriting System
## Self-Made Legends Life & Legacy Insurance Co. — Risk Analysis Engine

**Last Updated:** 2026-09-17  
**Status:** PRODUCTION READY  
**Version:** 1.0  
**Purpose:** AI-powered risk assessment and recommendation system for insurance policy underwriting

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Core Purpose & Scope](#2-core-purpose--scope)
3. [Intake Variables & Data Collection](#3-intake-variables--data-collection)
4. [Motherboard Reference Integration](#4-motherboard-reference-integration)
5. [Risk Scoring Logic](#5-risk-scoring-logic)
6. [Health Condition Analysis](#6-health-condition-analysis)
7. [Fraud Detection & Scoring](#7-fraud-detection--scoring)
8. [Compliance Monitoring](#8-compliance-monitoring)
9. [Structured JSON Output](#9-structured-json-output)
10. [Motherboard Logging & Pattern Analysis](#10-motherboard-logging--pattern-analysis)
11. [Customer-Facing Messaging](#11-customer-facing-messaging)
12. [Escalation Procedures](#12-escalation-procedures)
13. [Product-Specific Underwriting](#13-product-specific-underwriting)
14. [Scalability & Future Expansion](#14-scalability--future-expansion)
15. [Workflow & Integration](#15-workflow--integration)

---

## 1. System Overview

### 1.1 What the Autonomous Underwriting System Does

The Autonomous Underwriting System is the risk analysis engine of Self-Made Legends. It receives customer submissions from:
- **Agent Bot** (web chat interactions)
- **Website Quote Form** (direct customer submissions)
- **Partner Portal** (funeral home agents, brokers)

**The system does NOT:**
- Approve or deny policies
- Make final underwriting decisions
- Promise coverage or pricing
- Override human judgment

**The system DOES:**
- Analyze customer health, age, coverage, and risk factors
- Generate a risk score (0-100 scale)
- Produce underwriting recommendations (approve/review/decline)
- Integrate fraud detection analysis
- Monitor compliance guardrails
- Log all analysis to Motherboard AI
- Identify patterns for improvement

### 1.2 Core Philosophy

The Autonomous Underwriting System embodies SML's commitment to **clarity, compassion, and community**:

- **Clarity:** Risk assessment is transparent, based on objective criteria
- **Compassion:** System recognizes life complexity; health conditions don't automatically disqualify
- **Community:** Recommendations support SML's mission to serve underserved populations

---

## 2. Core Purpose & Scope

### 2.1 Primary Responsibilities

**Input Processing:**
- Receive structured customer submission data
- Validate data completeness and format
- Flag missing or inconsistent information

**Risk Analysis:**
- Evaluate age relative to coverage amount
- Assess health conditions and their severity
- Score smoker status impact
- Consider medical exam results (when available)
- Integrate fraud signals from Fraud Bot

**Recommendation Generation:**
- Generate risk_score (0-100 numerical)
- Produce recommendation (approve/review/decline)
- Provide explanation for recommendation
- Identify specific risk factors driving score

**Motherboard Integration:**
- Log all analysis results
- Contribute to pattern recognition
- Support continuous improvement

### 2.2 What Underwriting Is NOT

**The system CANNOT:**
- Promise any applicant will be approved
- Quote final premium rates (only guidelines)
- Provide medical advice or diagnoses
- Make subjective character judgments
- Discriminate based on protected characteristics
- Bypass Compliance Bot monitoring

**Customer-facing output must NEVER contain:**
- "You will be approved"
- "Your application meets our standards"
- "You qualify for coverage"
- "Your premium will be X"
- Any medical interpretation
- Any legal interpretation

---

## 3. Intake Variables & Data Collection

### 3.1 Required Intake Variables

**Applicant Demographics:**
- Full name
- Date of birth (for precise age calculation)
- Gender (binary option, with non-binary support planned)
- Contact email
- Contact phone number
- State of residence
- Preferred contact method

**Coverage Information:**
- Product type (Final Expense, Term Life, Whole Life, Accidental Death)
- Coverage amount requested
- Rider options (if applicable)

**Health Information:**
- Smoker status (current/former/never)
- Years since quitting (if former smoker)
- Current health conditions (checkbox list)
- Medications currently taking
- Any surgeries in last 5 years
- Recent hospitalizations
- Medical exam availability (yes/no)

**Application Intent:**
- Primary reason for seeking coverage
- Timeline urgency
- Preferred payment method

### 3.2 Optional But Valuable Variables

- Height and weight (BMI calculation)
- Alcohol consumption frequency
- Occupation type
- Family medical history (if disclosed)
- Previous insurance coverage
- Prior insurance denial history

### 3.3 Data Validation Rules

**Mandatory Fields Check:**
- Flag if date of birth missing or applicant too young (<18) or too old (>95)
- Flag if coverage amount is outside product bounds
- Flag if health status completely missing

**Format Validation:**
- Email must be valid format
- Phone must be valid US format
- State must be from SML operating states list
- Coverage amount must be numeric

**Consistency Checks:**
- Flag if age conflicts with life stage (e.g., young age requesting very high coverage)
- Flag if smoker status contradicts medication list
- Flag if no health information provided at all

**Data Quality Scoring:**
- 100% complete submission: 10 points
- 75-99% complete: 7 points
- 50-74% complete: 4 points
- <50% complete: Flag for follow-up

---

## 4. Motherboard Reference Integration

### 4.1 What the Motherboard Provides

The Motherboard AI system is the centralized repository of all SML business logic. The Underwriting System references:

**Underwriting Rules:**
```
Underwriting Rules (Motherboard):
├─ Age-based guidelines
│  ├─ 18-35: Standard approval thresholds
│  ├─ 36-50: Enhanced review thresholds
│  ├─ 51-65: Medical exam recommended
│  ├─ 66-80: Detailed medical history required
│  └─ 81+: Case-by-case review
│
├─ Coverage amount guidelines
│  ├─ Final Expense: $5K-$25K standard
│  ├─ Term Life: $25K-$500K by age
│  ├─ Whole Life: $5K-$50K simplified
│  └─ Accidental Death: $5K-$50K
│
├─ Health condition weights
│  ├─ Critical conditions (50-100 point deduction)
│  ├─ Major conditions (20-50 point deduction)
│  ├─ Minor conditions (5-20 point deduction)
│  └─ Managed conditions (0-10 point deduction)
│
├─ Fraud indicators
│  ├─ High-value coverage in low-income areas
│  ├─ Multiple applications in short timeframe
│  ├─ Inconsistent application history
│  ├─ Unrealistic beneficiary arrangements
│  └─ Suspicious timing patterns
│
├─ Compliance rules
│  ├─ Protected class restrictions
│  ├─ State-specific regulations
│  ├─ Prohibited language triggers
│  └─ Required disclosure statements
│
└─ Product definitions
   ├─ Final Expense coverage details
   ├─ Term Life rates and limits
   ├─ Whole Life features
   └─ Rider availability
```

### 4.2 Calling Motherboard During Analysis

**Workflow Query Pattern:**
```
Underwriting Bot: "Motherboard, analyze this applicant:
- 62 years old
- $15K Final Expense coverage
- History of controlled hypertension
- Current age guidelines?"

Motherboard: "Age 62 falls in 51-65 category. 
Hypertension is managed condition (5-10 points).
Medical exam recommended for this age+condition.
Approval likely if exam normal."
```

**Rule-Based Lookups:**
1. Get age category from guidelines
2. Look up coverage amount precedent
3. Cross-reference health conditions for point values
4. Check fraud indicators against known patterns
5. Verify compliance requirements for applicant's state

### 4.3 Motherboard Updates

The Underwriting System feeds learning back to Motherboard:
- "Applicants over age 70 with heart disease: 15% approval rate" (pattern)
- "Hypertension with controlled medication: 85% approval rate" (learning)
- "New fraud indicator: Multiple policies in same county within 30 days" (signal)
- "Recommendation accuracy trending upward in Q3" (performance)

---

## 5. Risk Scoring Logic

### 5.1 Risk Score Framework

**Scale:** 0-100 (lower score = lower risk = higher approval likelihood)

**Score Bands:**
- **0-25 (Green):** Standard approval likelihood, minimal review needed
- **26-50 (Yellow):** Conditional approval, requires standard review
- **51-75 (Orange):** Requires detailed review, possible clarification needed
- **76-100 (Red):** High risk, requires escalation, possible decline

### 5.2 Base Score Calculation

**Starting Point:** 50 (neutral baseline)

**Age Factor:**
```
Age Score Adjustment:
├─ 18-35:    -10 (lower age = lower risk)
├─ 36-50:     -5 (moderate age = slight advantage)
├─ 51-65:     +0  (no age penalty)
├─ 66-75:    +10  (higher age = higher risk)
├─ 76-85:    +20  (significantly higher risk)
└─ 86+:      +30  (maximum age risk)

Example: 45-year-old starts at 50 - 5 = 45 baseline
```

**Smoker Status Factor:**
```
Smoker Score Adjustment:
├─ Never smoked:        -15 (lowest risk)
├─ Former (10+ years):   -5 (low risk)
├─ Former (5-10 years):  +5 (moderate risk)
├─ Former (<5 years):   +15 (elevated risk)
└─ Current smoker:      +25 (highest risk)

Example: Current smoker at baseline 45 → 45 + 25 = 70
```

**Coverage Amount Factor:**
```
Coverage-to-Age Appropriateness:
├─ Age 18-35, requesting $50K+ term life:    -5 (good sense)
├─ Age 18-35, requesting $500K+ term life:   +10 (excess caution)
├─ Age 60-75, requesting $15K final expense:  -5 (appropriate)
├─ Age 60-75, requesting $100K+ coverage:    +20 (unusual pattern)
└─ High coverage relative to income signals: +15 (review needed)
```

**Health Risk Adjustments:** See Section 6 (Health Condition Analysis)

### 5.3 Fraud Score Integration

Fraud Bot provides a fraud_score (0-100):
- If fraud_score < 20: No adjustment
- If fraud_score 20-40: +5 to underwriting risk score
- If fraud_score 40-60: +15 to underwriting risk score
- If fraud_score 60-80: +25 to underwriting risk score
- If fraud_score > 80: Escalate immediately (doesn't follow normal scoring)

### 5.4 Score Caps & Floors

**Ceiling:** 100 maximum (system never produces score >100)

**Floor:** 0 minimum (system never produces negative score)

**Rounding:** Round to nearest whole number (45.6 = 46)

### 5.5 Example Risk Score Calculations

**Example 1: Low-Risk Applicant**
```
Name: James Anderson
Age: 32 | Gender: Male | Smoker: Never
Coverage: $25K Term Life | State: Texas

Calculation:
- Base: 50
- Age (32): -10 = 40
- Smoker (never): -15 = 25
- Coverage (appropriate for age): -5 = 20
- No health conditions: +0 = 20
- Fraud score (5): +0 = 20

FINAL RISK SCORE: 20 ✅ GREEN
```

**Example 2: Moderate-Risk Applicant**
```
Name: Patricia Mills
Age: 58 | Gender: Female | Smoker: Former (8 years)
Coverage: $15K Final Expense | Condition: Controlled hypertension
State: Ohio

Calculation:
- Base: 50
- Age (58): +0 = 50
- Smoker (former 8 years): +5 = 55
- Coverage (appropriate): +0 = 55
- Hypertension (managed): +8 = 63
- Fraud score (15): +0 = 63

FINAL RISK SCORE: 63 🟠 ORANGE
```

**Example 3: High-Risk Applicant**
```
Name: Robert Chen
Age: 71 | Gender: Male | Smoker: Current
Coverage: $100K Term Life | Conditions: Heart disease, diabetes, COPD
State: California

Calculation:
- Base: 50
- Age (71): +20 = 70
- Smoker (current): +25 = 95
- Coverage (excessive for age): +20 = 115 → capped at 100
- Heart disease: +40 (but already at cap)
- Fraud score (25): No additional (at cap)

FINAL RISK SCORE: 100 🔴 RED
```

---

## 6. Health Condition Analysis

### 6.1 Health Condition Classification

**Critical Conditions** (Major Impact: +40-100 points):
- Active cancer or recent cancer (within 3 years)
- End-stage renal disease (ESRD)
- Advanced heart disease or recent heart attack (<1 year)
- Severe COPD (requiring oxygen)
- HIV/AIDS
- Active stroke or TIA (within 6 months)
- Advanced Parkinson's or Alzheimer's
- Severe dementia

**Major Conditions** (+20-40 points):
- Controlled diabetes (Type 1 or 2)
- Hypertension (medicated)
- Heart disease (stable, managed)
- Moderate COPD (no oxygen)
- Arrhythmia (controlled)
- Sleep apnea (diagnosed, untreated or treated)
- Significant depression/bipolar disorder
- Chronic liver disease
- Significant kidney disease (not ESRD)

**Minor Conditions** (+5-20 points):
- Asthma (controlled)
- Seasonal allergies
- Thyroid disease (medicated)
- Mild anxiety disorder
- Gastric reflux/GERD
- Osteoarthritis
- Migraine headaches
- Obesity (BMI 30-39.9)

**Managed Conditions** (+0-10 points):
- High cholesterol (on medication)
- Prediabetes
- Well-controlled depression (on stable medication)
- Eczema/psoriasis
- Mild hearing loss
- Corrected vision issues
- Successfully treated substance abuse (5+ years sober)

### 6.2 Health Condition Scoring Rules

**Single Condition:**
- Apply the point value from classification above
- Adjust ±5 points based on management quality

**Multiple Conditions:**
- Sum point values (but apply cap logic)
- Max single adjustment from health: +50 points
- Exception: Critical conditions may exceed cap

**Medical Exam Status:**
- If medical exam completed and normal: -10 from health adjustment
- If medical exam completed with findings: +10 to relevant condition points
- If medical exam pending: +5 (uncertainty premium)
- If medical exam refused: +15 (flag for follow-up)

### 6.3 Special Health Scenarios

**Age-Specific Health Assessment:**
```
Age 18-35:
- Most health conditions score lower (managed effectively)
- Exceptions: Critical conditions still critical
- Generally favorable assessment

Age 36-50:
- Standard condition scoring
- Combination of conditions: Cumulative assessment

Age 51-65:
- Higher sensitivity to conditions
- Multiple condition combinations: More conservative scoring
- Medical exam becomes important

Age 65+:
- Multiple conditions common and expected
- Focus on stability and management
- Medical documentation critical
```

**Medication Alignment:**
- Applicant on medication for condition: Score as "managed" category
- Applicant with condition but NO medication: Score higher (+5-10)
- Applicant with outdated medication list: Flag for verification

**Progression & History:**
- Recent diagnosis (within 1 year): Score higher
- Condition stable 3+ years: Score lower
- Recently hospitalized: Score higher temporarily
- Emergency room visits in past year: Note for review

---

## 7. Fraud Detection & Scoring

### 7.1 Fraud Bot Integration

The Fraud Bot analyzes submissions independently and produces fraud_score (0-100). The Underwriting System:
- Receives fraud_score from Fraud Bot
- Does NOT duplicate fraud analysis
- Incorporates fraud_score into overall risk assessment
- Flags high fraud scores for escalation

### 7.2 Fraud Indicators Used in Underwriting

**Red Flags:**
```
High Priority (Escalate Immediately):
├─ Applicant age conflicts with birthdate
├─ Coverage amount inconsistent with stated income
├─ Beneficiary is non-family and recently added
├─ Multiple applications from same household
├─ Application follows recent policy lapse on similar product
└─ Inconsistent information across submissions

Medium Priority (Requires Review):
├─ First-time life insurance applicant seeking high coverage
├─ Multiple policy applications in short timeframe
├─ Applicant with history of prior insurance denial
├─ Coverage amount increases significantly in follow-up
├─ Claimed health status conflicts with social media presence
└─ Unusually high income claimed relative to occupation

Lower Priority (Requires Notation):
├─ Application submitted outside normal hours pattern
├─ Applicant location changed recently
├─ Declining health disclosure over time
└─ Multiple contact method changes
```

### 7.3 Fraud Score Integration Example

```
Scenario: Marcus Thompson
- Fraud Bot assessment: 65 (Medium-High fraud risk)
- Reason: Multiple applications in 30 days, high coverage for stated income
- Underwriting integration: +15 to risk score
- Recommendation: DECLINE until fraud investigation complete
- Note: Do not communicate fraud concerns to applicant (legal/compliance)
```

---

## 8. Compliance Monitoring

### 8.1 Compliance Bot Integration

Compliance Bot continuously monitors the Underwriting System's output to ensure:
- No prohibited language or implications
- No discrimination by protected class
- Adherence to state-specific regulations
- Proper disclosure statements included
- Data privacy standards maintained

### 8.2 Protected Class Analysis

**The system MUST NOT:**
- Consider race, color, national origin in scoring
- Consider religion in scoring
- Consider gender (except for medically documented gender-specific conditions)
- Consider disability status (only medical conditions matter)
- Consider marital status
- Consider sexual orientation or gender identity
- Make assumptions based on name or location

**The system MAY:**
- Consider age (actuarially sound)
- Consider gender-specific health conditions (e.g., prostate cancer in males)
- Consider occupational risk factors
- Consider location for state-specific regulation requirements

### 8.3 Compliance Guardrails

**Prohibited Output:**
```
❌ "You don't qualify for coverage"
❌ "Your age makes approval unlikely"
❌ "Your condition disqualifies you"
❌ "We'll probably decline this"
❌ "Standard approval expected"
❌ "You should expect rejection"
```

**Approved Output:**
```
✅ "We've analyzed your application and flagged items for review"
✅ "Your risk assessment indicates further medical information would help"
✅ "We recommend completing a medical exam"
✅ "Your application is being reviewed by our underwriting team"
✅ "Additional information would help us complete your assessment"
```

### 8.4 Escalation Scenarios

**Compliance Bot flags for escalation:**
- Any output suggesting denial or approval
- Any discriminatory language or implications
- Any medical or legal advice
- Age-based language that sounds discriminatory
- Any conditional approval language

**Response:**
- Reword output to neutral assessment language
- Remove time-bound predictions
- Focus on "what we need to review" not "what we expect to happen"

---

## 9. Structured JSON Output

### 9.1 Core Output Schema

Every underwriting analysis produces this JSON structure:

```json
{
  "analysis_id": "UW-2026-09-17-001234",
  "timestamp": "2026-09-17T14:32:00Z",
  "applicant": {
    "name": "James Anderson",
    "date_of_birth": "1994-03-15",
    "age": 32,
    "gender": "Male",
    "state": "TX"
  },
  "application": {
    "product_type": "Term Life",
    "coverage_amount": 250000,
    "submission_source": "Agent Bot",
    "submission_timestamp": "2026-09-17T14:28:00Z"
  },
  "health_profile": {
    "smoker_status": "Never",
    "health_conditions": [
      {
        "condition": "None reported",
        "severity": "N/A",
        "onset_date": null,
        "management": "N/A",
        "point_adjustment": 0
      }
    ],
    "medications": [],
    "recent_surgeries": false,
    "recent_hospitalizations": false,
    "medical_exam_available": true,
    "medical_exam_status": "Pending"
  },
  "risk_assessment": {
    "base_score": 50,
    "age_adjustment": -10,
    "smoker_adjustment": -15,
    "coverage_adjustment": -5,
    "health_adjustment": 0,
    "fraud_adjustment": 0,
    "final_risk_score": 20,
    "risk_band": "Green (0-25)"
  },
  "fraud_analysis": {
    "fraud_score": 5,
    "fraud_level": "Very Low",
    "fraud_flags": [],
    "fraud_bot_timestamp": "2026-09-17T14:31:00Z"
  },
  "recommendation": {
    "status": "Approve",
    "confidence": "High",
    "rationale": "Applicant presents as low-risk profile. Young age, non-smoker, no reported health conditions, coverage amount appropriate for age and product type. Medical exam can proceed or waived if per product guidelines.",
    "next_steps": [
      "Complete medical exam (optional per product)",
      "Proceed to underwriting review",
      "Initiate approval process if medical clear"
    ],
    "review_required": false,
    "escalation_needed": false
  },
  "compliance_check": {
    "status": "Clear",
    "language_check": "Pass",
    "discrimination_check": "Pass",
    "state_regulation_check": "Pass",
    "data_privacy_check": "Pass",
    "compliance_bot_timestamp": "2026-09-17T14:31:30Z"
  },
  "motherboard_logging": {
    "logged": true,
    "pattern_contribution": true,
    "improvement_suggestion": "Low-risk profiles with immediate approval recommendation contribute positively to conversion analytics",
    "motherboard_timestamp": "2026-09-17T14:32:00Z"
  }
}
```

### 9.2 Output Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `analysis_id` | String | Unique identifier for this underwriting analysis |
| `timestamp` | ISO 8601 | When analysis was completed |
| `applicant.name` | String | Applicant full name |
| `applicant.date_of_birth` | Date | Birth date (YYYY-MM-DD) |
| `applicant.age` | Integer | Calculated age in years |
| `applicant.gender` | String | Gender selection |
| `applicant.state` | String | State of residence (2-letter code) |
| `application.product_type` | String | Insurance product (Final Expense / Term Life / Whole Life / Accidental Death) |
| `application.coverage_amount` | Integer | Requested coverage amount in dollars |
| `application.submission_source` | String | Source (Agent Bot / Website / Partner Portal) |
| `application.submission_timestamp` | ISO 8601 | When applicant submitted |
| `health_profile.smoker_status` | String | Never / Former / Current |
| `health_profile.health_conditions` | Array | List of conditions with adjustments |
| `health_profile.medications` | Array | Current medication list |
| `health_profile.recent_surgeries` | Boolean | Any surgeries in past 5 years |
| `health_profile.recent_hospitalizations` | Boolean | Any hospitalizations in past 2 years |
| `health_profile.medical_exam_status` | String | Pending / Completed / Refused / Not Applicable |
| `risk_assessment.final_risk_score` | Integer | 0-100 risk score |
| `risk_assessment.risk_band` | String | Green / Yellow / Orange / Red |
| `fraud_analysis.fraud_score` | Integer | 0-100 fraud score from Fraud Bot |
| `fraud_analysis.fraud_level` | String | Very Low / Low / Medium / High / Critical |
| `recommendation.status` | String | Approve / Review / Decline |
| `recommendation.confidence` | String | High / Medium / Low |
| `recommendation.rationale` | String | Explanation of recommendation (never promising approval) |
| `recommendation.review_required` | Boolean | Does human review required |
| `recommendation.escalation_needed` | Boolean | Does escalation required |
| `compliance_check.status` | String | Clear / Warning / Failed |

### 9.3 Output Storage

**Storage Location:** Backend JSON storage system
**Format:** Individual JSON files per analysis
**Naming Convention:** `uw-analysis-{analysis_id}.json`
**Directory:** `/data/underwriting/analyses/`
**Retention:** 7-year minimum (legal requirement)

**Daily Aggregation:**
```json
{
  "date": "2026-09-17",
  "total_analyses": 147,
  "by_recommendation": {
    "approve": 85,
    "review": 42,
    "decline": 20
  },
  "by_risk_band": {
    "green": 85,
    "yellow": 42,
    "orange": 15,
    "red": 5
  },
  "average_risk_score": 38.2,
  "fraud_flags_count": 8,
  "compliance_issues": 0,
  "motherboard_improvements": 3
}
```

---

## 10. Motherboard Logging & Pattern Analysis

### 10.1 What Gets Logged to Motherboard

**Each underwriting analysis generates:**
1. Complete risk assessment results
2. Health condition scoring details
3. Fraud signal integration
4. Recommendation with confidence level
5. Compliance check results
6. Processing time and efficiency metrics

### 10.2 Pattern Recognition Workflow

**Daily Motherboard Analysis:**

```
Motherboard Pattern Recognition (Daily 12:00 AM UTC):
├─ Aggregate all underwriting analyses from past 24 hours
├─ Identify patterns in:
│  ├─ Risk score distribution (are scores rising/falling?)
│  ├─ Recommendation trends (approve/review/decline ratios)
│  ├─ Health condition prevalence (which conditions most common?)
│  ├─ Fraud signal effectiveness (how accurate were fraud flags?)
│  ├─ Age-based approval rates (unfair skewing?)
│  └─ Geographic patterns (certain states different outcomes?)
│
├─ Compare to historical patterns
├─ Identify anomalies and outliers
├─ Generate improvement suggestions
└─ Log findings for leadership review
```

### 10.3 Improvement Suggestions to Underwriting Rules

**Example: Motherboard Auto-Suggestion**

```
Motherboard Alert: Suggestion to Update Underwriting Rules

Pattern Detected:
- Applicants over 70 with managed hypertension: 78% approval rate
- Applicants over 70 with heart disease: 12% approval rate
- Current rule weight for hypertension: +8 points (seems appropriate)
- Current rule weight for heart disease: +40 points (may be too harsh)

Analysis:
- Heart disease outcomes suggest overweighting in risk assessment
- Many declined applicants with stable, well-managed disease
- Conflict with stated SML mission of serving underserved
- Consider: Medical documentation + stable management as mitigators

Suggestion:
- Update heart disease scoring from +40 to +25 for documented stable disease
- Add clinical documentation requirement before applying +40 weight
- Trial rule for 30 days and measure outcome changes

Recommend: Leadership review and approval before implementation
```

### 10.4 Motherboard Continuous Improvement Loop

```
Underwriting System ──→ Motherboard Logging
         ↓
   Daily Pattern Analysis
         ↓
   Anomaly & Trend Detection
         ↓
   Improvement Suggestions
         ↓
   Leadership Review & Approval
         ↓
   Rule Updates (if approved)
         ↓
   Reintegrate to Underwriting System
         ↓
   Measure Outcome Changes
         ↓
   Back to Logging Loop
```

---

## 11. Customer-Facing Messaging

### 11.1 What to Say to Applicants

**After Submission:**

```
"Thank you for applying with Self-Made Legends. We've received your 
application and our underwriting team is reviewing your information.

Next Steps:
- A member of our team will reach out within 1 business day
- We may need additional information or medical records
- This review helps us ensure we understand your situation fully
- Questions? Contact us at support@sml-insurance.com or 1-800-SML-LIFE

We appreciate your patience as we complete this process."
```

**If Additional Information Needed:**

```
"Thank you for your application. To complete our review, we'll need 
a bit more information:

[Specific items needed, e.g.:
- Recent medical records
- Medication list confirmation
- Authorization for medical exam]

Please provide these by [date]. If you have questions about what we're 
asking for, our team is happy to help at support@sml-insurance.com."
```

**After Underwriting Completes:**

```
"We've completed our review of your application. Your case is now 
moving to the next stage in our approval process.

What happens next:
- Our team will follow up to discuss your coverage options
- If approved, we'll help you with enrollment
- If additional review is needed, we'll let you know what that means
- You can reach out anytime with questions

We're committed to transparency throughout this process."
```

### 11.2 What NEVER to Tell Applicants

**PROHIBITED MESSAGES:**
```
❌ "You will be approved" / "You should be approved"
❌ "You'll be declined" / "We probably can't cover you"
❌ "Your age/health makes approval unlikely"
❌ "You don't meet our standards"
❌ "That condition disqualifies you"
❌ "We expect this to be quick/slow"
❌ "Here's what your premium will be" (quote guidelines only)
❌ "Based on your medical history, you should..." (medical advice)
❌ "The law says we..." (legal advice)
```

### 11.3 Tone Guidelines

**Always:**
- Be warm, professional, and clear
- Acknowledge the importance of their decision
- Show respect for their health situation
- Explain what we're doing and why
- Offer contact options for questions
- Avoid jargon or explain technical terms

**Never:**
- Make predictions about outcomes
- Offer medical or legal interpretations
- Sound dismissive or clinical
- Suggest we know better than they do
- Make their application feel like judgment
- Rush or pressure them

---

## 12. Escalation Procedures

### 12.1 When to Escalate

**Automatic Escalations:**
```
Escalation Rule: Risk Score Analysis
├─ Risk Score 0-25 (Green): No escalation → proceed to carrier
├─ Risk Score 26-50 (Yellow): Standard review → carrier submission
├─ Risk Score 51-75 (Orange): Requires human review → Underwriting Manager
├─ Risk Score 76-100 (Red): Immediate escalation → Senior Underwriter
└─ Score 100 + Fraud Score >60: Escalate to Fraud Team + Legal

Escalation Rule: Fraud Signals
├─ Fraud score 0-20: No escalation
├─ Fraud score 21-40: Flag for review notation
├─ Fraud score 41-60: Escalate to Fraud Bot + Underwriting Manager
├─ Fraud score 61-80: Escalate to Fraud Investigator + Hold application
└─ Fraud score 81-100: Legal team + Law enforcement consideration

Escalation Rule: Compliance Failures
├─ Compliance status "Clear": No escalation
├─ Compliance status "Warning": Document and flag for review
└─ Compliance status "Failed": Stop processing → Compliance Officer review
```

### 12.2 Escalation Workflows

**Standard Escalation (Orange Band - Risk Score 51-75):**

```
Step 1: System flags to Underwriting Manager
Step 2: Manager reviews complete application + risk factors
Step 3: Manager decision:
        ├─ Can approve with conditions → Document conditions
        ├─ Require additional medical info → Request from applicant
        ├─ Deny without further review → Issue declination
        └─ Unsure → Escalate to Senior Underwriter
Step 4: Document decision in system
Step 5: Update applicant and proceed accordingly
Timeline: 3-5 business days
```

**High-Risk Escalation (Red Band - Risk Score 76-100):**

```
Step 1: System auto-flags to Senior Underwriter
Step 2: Senior Underwriter conducts detailed case review
Step 3: Review includes:
        ├─ Applicant health history analysis
        ├─ Fraud signal verification
        ├─ Comparable case precedent research
        ├─ State regulation compliance check
        └─ Carrier submission feasibility assessment
Step 4: Senior Underwriter decision:
        ├─ Approve (may attach conditions) → Proceed to carrier
        ├─ Request additional medical documentation → Follow up with applicant
        ├─ Decline with detailed reasoning → Prepare decline communication
        └─ Refer to medical advisor → Get specialist opinion
Step 5: Document reasoning for all decisions
Step 6: Communicate with applicant and carrier
Timeline: 5-10 business days
```

**Fraud Escalation (Fraud Score >60):**

```
Step 1: System auto-flags to Fraud Bot team
Step 2: Fraud investigator conducts investigation:
        ├─ Verify applicant identity
        ├─ Check application consistency
        ├─ Review beneficiary relationships
        ├─ Cross-reference with known fraud patterns
        └─ Coordinate with other insurers if applicable
Step 3: Investigation conclusion:
        ├─ Fraud suspected → Refer to law enforcement
        ├─ Unable to verify → Decline application
        ├─ Likely legitimate → Escalate back to normal underwriting
        └─ Inconclusive → Place application on hold
Step 4: Document all findings
Step 5: Coordinate with legal/compliance as needed
Timeline: 7-14 business days (may be extended)
```

### 12.3 No Self-Approval

**Critical Rule:** The Underwriting System never auto-approves. Every application requires:
- Green band (0-25): Carrier submission only (not final approval)
- Yellow band (26-50): Basic review + carrier submission
- Orange band (51-75): Manager review required
- Red band (76-100): Senior underwriter required

Final approval authority remains with:
1. Insurance carrier (policy issuance)
2. Human underwriters (internal review)
3. Compliance officer (legal/regulatory)

**Never:** The system, bots, or AI makes final approval decisions

---

## 13. Product-Specific Underwriting

### 13.1 Final Expense Insurance

**Product Parameters:**
- Coverage: $5,000 - $25,000
- Age range: 40-85 years old
- Underwriting approach: Simplified
- Medical exam: Not typically required

**Underwriting Specifics:**
```
Final Expense Risk Factors:
├─ Age (most critical factor for this product)
├─ Smoking status (significant impact)
├─ General health status (major conditions flagged)
├─ Coverage appropriateness (limit for age)
└─ Fraud indicators (unusual beneficiary patterns)

Health Condition Scoring (Final Expense):
├─ Heart disease: +15 (vs. +40 for term life)
├─ COPD: +12 (vs. +25 for term life)
├─ Diabetes: +8 (vs. +15 for term life)
└─ Hypertension: +5 (vs. +10 for term life)

Note: Final Expense is simplified product; less aggressive scoring
```

### 13.2 Term Life Insurance

**Product Parameters:**
- Coverage: $25,000 - $500,000 (age-dependent)
- Age range: 18-75 years old
- Underwriting approach: Standard
- Medical exam: Required for high coverage amounts

**Underwriting Specifics:**
```
Term Life Risk Factors:
├─ Age (significant factor across spectrum)
├─ Health conditions (comprehensive assessment)
├─ Coverage amount relative to age
├─ Smoking status (critical)
├─ Medical exam results (when completed)
├─ Beneficiary appropriateness
└─ Fraud indicators (high-value policies need scrutiny)

Medical Exam Triggers (Term Life):
├─ Under age 40, coverage <$100K: Not required
├─ Age 40-50, coverage $100K-$250K: Recommended
├─ Age 50-60, coverage >$100K: Required
├─ Age 60+, any coverage: Required
```

### 13.3 Whole Life Insurance (Simplified)

**Product Parameters:**
- Coverage: $5,000 - $50,000
- Age range: 45-80 years old
- Underwriting approach: Simplified
- Medical exam: Often not required

**Underwriting Specifics:**
```
Whole Life Risk Factors:
├─ Age (moderate impact due to simplified nature)
├─ General health status (major conditions flagged)
├─ Smoking status (significant)
├─ Coverage appropriateness
└─ Fraud indicators (unusual patterns for whole life)

Health Condition Scoring (Whole Life):
├─ Heart disease: +20 (moderate scoring)
├─ COPD: +15
├─ Diabetes: +10
├─ Hypertension: +6
└─ Other managed: +3-5 each

Note: Whole Life is lifetime coverage; higher scrutiny on health
```

### 13.4 Accidental Death Insurance

**Product Parameters:**
- Coverage: $5,000 - $50,000
- Age range: 18-75 years old
- Underwriting approach: Simplified
- Medical exam: Not required

**Underwriting Specifics:**
```
Accidental Death Risk Factors:
├─ Age (moderate impact)
├─ Occupation (high-risk jobs flagged)
├─ Lifestyle/hobbies (dangerous activities noted)
├─ Prior accidental injuries
├─ Fraud indicators (obvious beneficiary concerns)
└─ Health status (minimal relevance for accidental death)

Note: Accidental death is low-underwriting-friction product
Applicants rarely declined for health reasons
Focus is on prevention of fraud and moral hazard
```

---

## 14. Scalability & Future Expansion

### 14.1 Current System Capacity

**Volume Handling:**
- Current design: 100-500 applications/day
- System latency: <30 seconds per analysis
- Backend storage: JSON file system (scalable to 1M+ records)
- Motherboard processing: Daily batch analysis

### 14.2 Scaling Path

**Phase 1 (Current):** Final Expense + core products
- 100-500 apps/day
- Single region (US)
- Current tech stack

**Phase 2 (Months 6-12):** 3-5 products
- 1,000-2,000 apps/day
- Regional expansion (20 states)
- Database optimization

**Phase 3 (Months 12-18):** National expansion
- 5,000-10,000 apps/day
- All 50 states
- Cloud infrastructure scaling
- API-based underwriting

**Phase 4 (Months 24+):** Ecosystem expansion
- 20,000+ apps/day
- International consideration
- Real-time risk assessment
- White-label underwriting engine

### 14.3 Future Product Integration

**Template for New Products:**

```
When adding new insurance product:

1. Define underwriting rules (with Motherboard)
2. Create health condition scoring for new product
3. Set coverage amount ranges and age limits
4. Establish medical exam requirements
5. Create compliance guardrails for product
6. Test with sample applicant cohort
7. Monitor initial results for pattern analysis
8. Iterate based on Motherboard learnings

Example: Adding disability insurance
├─ Occupation classification required
├─ Income verification needed
├─ Existing disability coverage check
├─ Health conditions relevant to disability
├─ Recovery trajectory assessment
└─ Pre-existing condition limitations
```

### 14.4 AI/ML Enhancements (Future)

**Potential improvements:**
- Predictive modeling for approval likelihood
- Applicant drop-off prediction and intervention
- Fraud pattern detection via machine learning
- Personalized risk assessment (age/condition cohorts)
- Natural language processing for health narrative analysis
- Computer vision for document verification

**Rollout approach:**
- Build models in parallel with current system
- Validate accuracy before integration
- Gradual rollout with monitoring
- Maintain human override capability
- Continuous retraining on new data

---

## 15. Workflow & Integration

### 15.1 Complete End-to-End Workflow

```
┌─────────────────────────────────────────────────────┐
│  APPLICANT SUBMISSION                               │
│  (Agent Bot or Website Quote Form)                  │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  DATA VALIDATION & INTAKE                           │
│  • Verify all required fields present               │
│  • Format validation (email, phone, etc.)           │
│  • Flag missing or inconsistent data                │
│  • Generate data quality score                      │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  MOTHERBOARD REFERENCE                              │
│  • Load applicable underwriting rules               │
│  • Get age guidelines for applicant                 │
│  • Retrieve product parameters                      │
│  • Check compliance requirements                    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  RISK SCORING CALCULATION                           │
│  • Apply age factor                                 │
│  • Apply smoker status factor                       │
│  • Apply coverage appropriateness adjustment        │
│  • Calculate health condition adjustments           │
│  • Generate preliminary risk_score                  │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  FRAUD BOT ANALYSIS (Parallel)                      │
│  • Analyze for fraud indicators                     │
│  • Generate fraud_score (0-100)                     │
│  • Identify red flags                               │
│  • Pass fraud_score back to underwriting            │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  INTEGRATE FRAUD SCORE                              │
│  • Adjust risk_score based on fraud_score           │
│  • Flag high-fraud scenarios for escalation         │
│  • Generate final risk_score (0-100)                │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  GENERATE RECOMMENDATION                            │
│  • Map risk_score to recommendation (approve/       │
│    review/decline)                                  │
│  • Set confidence level                             │
│  • Create rationale (no approval promises)          │
│  • Identify next steps                              │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  COMPLIANCE BOT CHECK                               │
│  • Verify no discriminatory language                │
│  • Confirm no medical/legal advice                  │
│  • Check state regulation compliance                │
│  • Validate data privacy                            │
│  • Flag any compliance issues                       │
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
    PASS                FAIL
        │                 │
        ▼                 ▼
    Generate JSON      Reword Output
    JSON Output        Try Compliance
        │               Check Again
        │                 │
        └────────┬────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  STRUCTURED JSON OUTPUT                             │
│  • Applicant information                            │
│  • Application details                              │
│  • Health profile                                   │
│  • Risk assessment details                          │
│  • Fraud analysis results                           │
│  • Recommendation with rationale                    │
│  • Compliance status                                │
│  • Motherboard logging flag                         │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  MOTHERBOARD LOGGING                                │
│  • Store complete analysis record                   │
│  • Contribute to pattern database                   │
│  • Flag for improvement suggestions                 │
│  • Log processing metrics                           │
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────┴────────┬──────────────┐
        │                 │              │
   GREEN             YELLOW/ORANGE      RED
 (0-25)            (26-75)            (76-100)
        │                 │              │
        ▼                 ▼              ▼
   CARRIER      MANAGER REVIEW    SENIOR UNDERWRITER
   SUBMISSION   REQUIRED          REQUIRED
        │                 │              │
        └────────┬────────┴──────────────┘
                 │
                 ▼
    ┌──────────────────────────────────┐
    │  APPLICANT NOTIFICATION           │
    │  • Neutral, non-committal message │
    │  • Explain next steps             │
    │  • Provide contact info           │
    │  • Set timeline expectations      │
    └──────────────────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────┐
    │  BACKEND STORAGE                  │
    │  • JSON file (7-year retention)   │
    │  • Daily aggregation              │
    │  • Analytics & reporting          │
    └──────────────────────────────────┘
```

### 15.2 Integration Points

**Incoming Integration:**
- Agent Bot → submits applications
- Website quote form → submits applications
- Partner portal → submits applications
- Medical records → optional supplemental data

**Outgoing Integration:**
- Motherboard AI ← logs all analyses
- Fraud Bot ← receives fraud_score
- Compliance Bot ← sends for monitoring
- Carrier submission system ← approved apps
- Backend JSON storage ← complete records
- Customer communication system ← applicant messages

### 15.3 Error Handling

**If analysis fails:**
- Log error to Motherboard with timestamp
- Alert underwriting team
- Request manual review
- Flag in system as "needs review"
- Do NOT provide incomplete assessment to applicant

**If fraud score unavailable:**
- Proceed with standard underwriting
- Add +5 to risk score (uncertainty premium)
- Flag for manual review
- Retry Fraud Bot on next cycle

**If Compliance Bot unavailable:**
- Manual compliance review required
- Do NOT release analysis without review
- Escalate to Compliance Officer
- Document the delay

---

## Core Philosophy: The Promise & The Guardrail

**The Promise:** The Autonomous Underwriting System provides clear, consistent, objective risk assessment to fuel fair decision-making.

**The Guardrail:** The system NEVER promises approval, makes final decisions, or overrides human judgment. It serves underwriters, not replaces them.

**In Service of SML's Mission:** Every analysis supports our commitment to clarity, compassion, and community—helping families access the insurance protection they need.

---

**SML Autonomous Underwriting System — Complete and Production Ready**

**Status:** ACTIVE  
**Last Updated:** 2026-09-17  
**Integrated With:** Motherboard AI, Fraud Bot, Compliance Bot, Backend Storage  
**Next Review:** Monthly with leadership team  

Built with clarity, compassion, and rigorous underwriting discipline. 🏆
