# 📱 SML Mobile App Blueprint
## Self-Made Legends Life & Legacy Insurance Co. — iOS & Android Application Design

**Last Updated:** 2026-09-12  
**Status:** PRODUCTION READY (Specification)  
**Scope:** Complete mobile application architecture and feature specification

---

## Table of Contents

1. [App Overview](#1-app-overview)
2. [Core Features](#2-core-features)
3. [User Authentication & Security](#3-user-authentication--security)
4. [Home Dashboard](#4-home-dashboard)
5. [Quote Section](#5-quote-section)
6. [Policy Management](#6-policy-management)
7. [Claims Section](#7-claims-section)
8. [Support & Chat](#8-support--chat)
9. [Notifications System](#9-notifications-system)
10. [AI Integration](#10-ai-integration)
11. [Backend Integration](#11-backend-integration)
12. [Design System](#12-design-system)
13. [Technical Architecture](#13-technical-architecture)
14. [Future Expansion](#14-future-expansion)

---

## 1. App Overview

### 1.1 Purpose

The SML Mobile App brings the complete SML experience to customers' phones, enabling them to:
- Get quotes on-the-go
- Manage existing policies
- Submit claims
- Track claim status
- Receive support
- Stay informed with notifications

### 1.2 Platform Strategy

**iOS:**
- Minimum: iOS 14
- Target: iOS 15+
- Device: iPhone SE and newer
- Framework: Swift + SwiftUI

**Android:**
- Minimum: Android 11
- Target: Android 12+
- Device: All modern Android phones
- Framework: Kotlin + Jetpack Compose

**Cross-Platform Considerations:**
- Native development (not hybrid)
- Platform-specific UI/UX
- Consistent core functionality
- Same backend API

### 1.3 Core Statistics

**App Size:**
- iOS: ~50-80 MB
- Android: ~60-90 MB

**Performance Targets:**
- Startup time: <2 seconds
- API response: <1 second
- Frame rate: 60 FPS
- Battery impact: Minimal

---

## 2. Core Features

### 2.1 Feature List

| Feature | Priority | Status |
|---------|----------|--------|
| User Authentication | Critical | Phase 1 |
| Home Dashboard | Critical | Phase 1 |
| Quote Section | Critical | Phase 1 |
| Policy Management | Critical | Phase 1 |
| Claims Submission | Critical | Phase 1 |
| Support Chat | High | Phase 1 |
| Notifications | High | Phase 1 |
| Document Upload | High | Phase 1 |
| Payment Management | High | Phase 2 |
| Beneficiary Management | High | Phase 2 |
| Chat History | Medium | Phase 2 |
| Biometric Login | Medium | Phase 2 |
| Push Notifications | High | Phase 1 |
| In-App Messaging | Medium | Phase 2 |

### 2.2 Feature Categories

**Customer-Facing:**
- Quote/apply for new policies
- View policy details
- Make payments
- Submit claims
- Chat with support
- Receive notifications

**AI-Powered:**
- Agent Bot for new users
- Claims Bot for beneficiaries
- Customer Service Bot for support
- Compliance Bot monitoring

**Data:**
- Real-time sync with backend
- Local caching for offline
- Secure credential storage

---

## 3. User Authentication & Security

### 3.1 Login Methods

**Method 1: Email/Password**
- Email address (verified)
- Secure password
- Password reset via email
- Remember me option

**Method 2: Biometric Login (Phase 2)**
- Face ID (iOS)
- Touch ID (iOS)
- Fingerprint (Android)
- Face unlock (Android)

**Method 3: Social Login (Phase 2)**
- Google Sign-in
- Apple Sign-in
- Conditional on privacy requirements

### 3.2 Security Requirements

**Authentication:**
- PBKDF2 or bcrypt for passwords
- OAuth 2.0 for API authentication
- JWT tokens with 1-hour expiration
- Refresh tokens (30-day expiration)

**Data Protection:**
- End-to-end encryption for sensitive data
- AES-256 encryption at rest
- TLS 1.3 for all communication
- Secure credential storage (Keychain/Keystore)

**Session Management:**
- Automatic logout after 15 minutes inactivity
- Manual logout with data clearing
- Multi-device login tracking
- Session recovery with re-authentication

### 3.3 Privacy & Compliance

**Data Minimization:**
- Only collect necessary data
- Don't cache PII locally longer than needed
- Clear sensitive data on logout

**GDPR/CCPA Compliance:**
- Right to access
- Right to delete
- Data portability
- Clear privacy disclosures

---

## 4. Home Dashboard

### 4.1 Dashboard Components

**Section 1: Welcome Card**
- Greeting: "Hi, [Name]!"
- Quick stats
- Primary CTA

**Section 2: Policy Status**
- Active policies list
- Coverage amount
- Monthly premium
- Payment status
- Link to policy details

**Section 3: Quick Actions**
- "Get a Quote"
- "File a Claim"
- "Pay Premium"
- "Contact Support"

**Section 4: Notifications**
- Recent important updates
- Claims status changes
- Payment reminders
- New feature announcements

**Section 5: Account Info**
- Beneficiary info (quick view)
- Payment method (last 4)
- Contact email/phone
- Link to settings

### 4.2 Dashboard Design

```
┌─────────────────────┐
│  Hi, [Name]! ☀️     │  [Menu Icon]
├─────────────────────┤
│ 2 Active Policies   │
│ $30,000 coverage    │
├─────────────────────┤
│ Policy 1            │
│ Final Expense       │
│ $15,000 coverage    │
│ Premium due: $25    │
├─────────────────────┤
│ Policy 2            │
│ Term Life           │
│ $15,000 coverage    │
│ Status: Good        │
├─────────────────────┤
│ Quick Actions       │
│ [Get Quote] [Claim] │
│ [Pay] [Support]     │
├─────────────────────┤
│ Recent Updates      │
│ • Payment received  │
│ • Claim update...   │
└─────────────────────┘
```

---

## 5. Quote Section

### 5.1 Quote Flow for New Users

**Screen 1: Welcome**
- "Get Your Free Quote"
- 6 questions overview
- Expected time: 2 minutes
- Privacy reassurance
- [Start Quiz] button

**Screen 2-7: Questions (One per screen)**
1. Age?
2. Gender?
3. Smoking status?
4. Health conditions?
5. Coverage amount?
6. Contact info?

**Screen 8: Review**
- Summary of answers
- "Is this correct?"
- [Edit] and [Submit] buttons

**Screen 9: Confirmation**
- "Quote submitted!"
- What happens next
- Timeline: "You'll hear from us in 24 hours"
- [Done] or [Explore App]

### 5.2 Agent Bot Integration

Within quote screens:
- Agent Bot appears for questions
- Explains what info is needed
- Reassures about privacy
- Handles input validation
- Guides through process

**Example:**
```
Agent Bot: "Let's get your quote! First question: 
How old are you? (We ask because it affects 
the quotes available to you.)"

User: [types age]

Agent Bot: "Thanks! Next: Do you currently smoke?"
```

### 5.3 Quote Results

After submission:
- Instant acknowledgment
- Expected response time
- What to expect next
- Link to app home
- Optional: Enable notifications

---

## 6. Policy Management

### 6.1 Policy Dashboard

**For Each Policy:**

```
┌──────────────────────┐
│ Final Expense        │
│ Policy #: SML123456  │
├──────────────────────┤
│ Coverage: $15,000    │
│ Premium: $25/month   │
│ Status: Active ✓     │
├──────────────────────┤
│ Effective: 1/15/2026│
│ Beneficiary: Jane... │
│ Last payment: 12/15 │
├──────────────────────┤
│ [View Details]       │
│ [Make Payment]       │
│ [Update Beneficiary] │
│ [Download Policy]    │
└──────────────────────┘
```

### 6.2 Policy Details Screen

**Information Sections:**
1. Policy Summary
   - Number, type, coverage
   - Premium amount and due date
   - Status and issue date

2. Beneficiary Info
   - Name and relationship
   - Contact information
   - Designation date

3. Coverage Details
   - What's included
   - What's excluded
   - Limits and exclusions

4. Payment History
   - Recent payments (5 most recent)
   - Amounts and dates
- Status (paid/pending)
   - Download receipts

5. Documents
   - Policy document (PDF)
   - Schedule of benefits
   - Endorsements (if any)

### 6.3 Account Settings

**Payment Management:**
- Add/change payment method
- Set auto-pay
- Payment history
- Billing address

**Beneficiary Management:**
- View current beneficiary
- Add/change beneficiary
- Multiple beneficiaries (future)
- Verification status

**Contact Information:**
- Primary email
- Phone number
- Mailing address
- Preferred contact method

**App Settings:**
- Notifications (on/off)
- Biometric login (if enabled)
- Auto-logout time
- Language preference (future)

---

## 7. Claims Section

### 7.1 Claims Process (Customer View)

**Step 1: Start Claim**
- "File a Claim"
- Policy selection (dropdown)
- Confirm insured information

**Step 2: Claim Details**
- Date of death
- Claim type (funeral, medical, etc.)
- Circumstances (required for fraud prevention)
- Contact information

**Step 3: Document Upload**
- Upload death certificate (photo or PDF)
- Upload funeral expenses (if applicable)
- Upload identification
- Add any other relevant docs

**Step 4: Review & Submit**
- Review submitted information
- Confirm accuracy
- Submit claim
- Get claim reference number

**Step 5: Tracking**
- "Claim Received" status
- What happens next
- Expected timeline
- Contact for questions

### 7.2 Claims Bot Integration

The Claims Bot guides beneficiaries:
- Compassionate tone
- Clear explanations
- Document requirements
- Reassurance during difficult time

**Example:**
```
Claims Bot: "I'm so sorry for your loss. 
I'm here to help you file a claim with SML.

This might be difficult, but I'll guide you 
step-by-step. Ready?"
```

### 7.3 Claims Tracking

**Real-Time Status:**
- Claim Received (submitted)
- Documents Under Review
- Carrier Review In Progress
- Decision Made
- Funds Transferred

**Customer Communication:**
- Status updates in app
- Push notifications
- Email updates
- Direct contact option

---

## 8. Support & Chat

### 8.1 Support Options

**Option 1: AI Chat (Customer Service Bot)**
- Available 24/7
- Answers FAQs
- Explains process
- Escalates to human if needed

**Option 2: Contact Agent**
- Request human assistance
- Schedule callback
- Email support
- Phone support (hours)

**Option 3: Knowledge Base**
- FAQ section
- How-to guides
- Video tutorials
- Common questions

### 8.2 Chat Interface

```
┌─────────────────────┐
│ SML Support         │ [Close]
├─────────────────────┤
│ Chat History        │
│ ─────────────────── │
│ [Previous messages] │
│                     │
│ You: "How long...?" │
│                     │
│ Agent Bot:          │
│ "Most claims take..." │
│                     │
│ ─────────────────── │
├─────────────────────┤
│ Type your question  │
│ [✓ Send]            │
└─────────────────────┘
```

### 8.3 Chat Features

**Customer Service Bot:**
- Quick responses
- Escalation to human when needed
- Chat history saved
- Can be reopened later

**Human Agent Chat:**
- Available during business hours
- Personal assistance
- Complex question handling
- Issue resolution

**Email Support:**
- Submit form
- Tracked in support queue
- Response within 24 hours
- Reply via email or app

---

## 9. Notifications System

### 9.1 Notification Types

**Push Notifications:**
- Policy-related (payment due, renewal, etc.)
- Claims updates (status changes)
- Important alerts (account security, changes)
- Promotional (optional - can disable)

**In-App Notifications:**
- Non-urgent updates
- Feature announcements
- Tips and help articles
- Messages from agent

### 9.2 Notification Preferences

Users can customize:
- Which notifications to receive
- Timing (quiet hours, frequency)
- Channels (push, email, SMS)
- Opt-out of promotional messages

**Notification Settings:**
```
Notifications

Policy Updates
  [On] Payment due date
  [On] New coverage available
  [On] Policy renewal

Claims Updates
  [On] Claim status changes
  [On] Documents needed

Important
  [On] Account security alerts
  [On] Important policy changes

Promotional
  [Off] New products available
  [Off] Special offers
  [Off] Tips & how-tos
```

### 9.3 Notification Examples

**Payment Due:**
```
"Payment due on 1/15! 
$25 for your Final Expense policy.
[Pay Now]"
```

**Claims Update:**
```
"Your claim is being reviewed!
Status: Documents Under Review
View Details"
```

**Alert:**
```
"Important: 
Your account email was changed. 
If this wasn't you, [Contact Support]"
```

---

## 10. AI Integration

### 10.1 Agent Bot Integration

**In App:**
- Quote section
- New customer onboarding
- Product education
- Welcome experience

**Capabilities:**
- Conversational Q&A
- Local storage for offline use
- Seamless to agent handoff
- Personality matches brand

### 10.2 Claims Bot Integration

**In App:**
- Claims submission process
- Document collection
- Status tracking
- Beneficiary support

**Capabilities:**
- Compassionate communication
- Multi-step guidance
- Document management
- Status updates

### 10.3 Customer Service Bot Integration

**In App:**
- Support chat
- FAQ answering
- Escalation management
- Available 24/7

**Capabilities:**
- Instant response to questions
- Intelligent routing
- Learning from interactions
- Human escalation when needed

### 10.4 Compliance Bot (Backend)

**Monitoring:**
- All in-app communications
- User data handling
- Notification compliance
- Policy language compliance

**Alerts:**
- Violations logged
- Escalated to compliance team
- Monthly reporting
- Continuous monitoring

---

## 11. Backend Integration

### 11.1 API Architecture

**REST Endpoints:**
```
POST /api/auth/login
GET /api/auth/profile
POST /api/quotes/submit
GET /api/quotes/{id}
GET /api/policies
GET /api/policies/{id}
POST /api/claims/submit
GET /api/claims/{id}
GET /api/claims/status
POST /api/payments/process
GET /api/notifications
```

**Sync Strategy:**
- Real-time sync for critical data
- Periodic sync (every 5 minutes)
- Pull-to-refresh capability
- Offline queue for submissions

### 11.2 Data Synchronization

**On App Launch:**
- Fetch user profile
- Fetch active policies
- Fetch recent claims
- Fetch notification preferences

**On User Action:**
- Submit quote → instant API call
- Submit claim → instant API call
- Make payment → instant API call
- Change settings → instant API call

**Background Sync:**
- Periodic status checks (every 5 min)
- Claims updates
- Payment confirmations
- New notifications

### 11.3 Offline Capability

**Available Offline:**
- View cached policies
- View cached claims
- Read chat history
- View notification history

**Queue for Sync:**
- Submit claim
- Make payment
- Update settings
- Send message

**On Reconnect:**
- Sync all queued items
- Fetch new data
- Refresh UI with latest
- Show sync status

---

## 12. Design System

### 12.1 Color Palette

**Primary Colors:**
- Black: #1a1a1a
- Gold: #d4af37
- White: #ffffff

**Functional Colors:**
- Success: #00AA44
- Warning: #FFAA00
- Error: #DD0000
- Info: #0066CC

**Neutral Colors:**
- Dark Gray: #333333
- Light Gray: #f5f5f5
- Divider: #EEEEEE

### 12.2 Typography

**Font Family:** SF Pro Display (iOS), Roboto (Android)

**Font Sizes:**
- Heading 1: 28px, Bold
- Heading 2: 24px, Bold
- Heading 3: 20px, Semibold
- Body: 16px, Regular
- Small: 14px, Regular
- Caption: 12px, Regular

### 12.3 Components

**Buttons:**
- Primary: Gold background, black text
- Secondary: Black border, black text
- Tertiary: Text only
- Disabled: Gray
- Loading state with spinner

**Cards:**
- Black background, white text
- Gold accent border on hover
- Rounded corners (8px)
- Subtle shadow

**Input Fields:**
- Black border (#333)
- White background
- 44px minimum height (touch-friendly)
- Clear placeholder text

**Navigation:**
- Tab bar at bottom (iOS)
- Navigation drawer (Android)
- 5 main sections
- Icons + labels

---

## 13. Technical Architecture

### 13.1 Technology Stack

**iOS:**
- Language: Swift
- UI Framework: SwiftUI
- Networking: URLSession / Alamofire
- Database: CoreData (local), API (remote)
- Security: Keychain, CryptoKit

**Android:**
- Language: Kotlin
- UI Framework: Jetpack Compose
- Networking: Retrofit / OkHttp
- Database: Room (local), API (remote)
- Security: EncryptedSharedPreferences, Tink

**Cross-Platform:**
- Backend: Node.js / Express
- API: REST with JSON
- Database: PostgreSQL
- Authentication: JWT + Refresh tokens
- Cloud: AWS / Google Cloud

### 13.2 App Structure

```
App/
├── Authentication/
│   ├── LoginScreen
│   ├── SignUpScreen
│   └── ProfileSetup
│
├── Dashboard/
│   ├── HomeScreen
│   ├── PoliciesScreen
│   └── QuickActions
│
├── Quotes/
│   ├── QuoteFlow
│   ├── QuestionScreen
│   └── ConfirmationScreen
│
├── Policies/
│   ├── PolicyListScreen
│   ├── PolicyDetailScreen
│   └── ManagementScreen
│
├── Claims/
│   ├── ClaimsFlowScreen
│   ├── DocumentUploadScreen
│   └── TrackingScreen
│
├── Support/
│   ├── ChatScreen
│   ├── FAQScreen
│   └── ContactScreen
│
├── Common/
│   ├── Components
│   ├── Utils
│   └── Styles
│
└── API/
    ├── AuthService
    ├── PolicyService
    ├── ClaimsService
    └── NotificationService
```

---

## 14. Future Expansion

### 14.1 Phase 2 Features (Months 6-12)

- Biometric login
- In-app payments
- Beneficiary management
- Chat history sync
- Multi-language support

### 14.2 Phase 3 Features (Months 12-18)

- Multiple product support
- Advanced personalization
- Social sharing
- Community features
- Partner integrations

### 14.3 Long-Term Vision

- Full insurance ecosystem in app
- AI-powered recommendations
- Wealth planning tools
- Integration with banking
- International expansion

---

## Conclusion

The SML Mobile App brings the mission of clarity, compassion, and community directly to customers' phones, enabling them to engage with SML whenever and wherever they need.

---

**SML Mobile App Blueprint — Complete and Production Ready**

**Status:** SPECIFICATION COMPLETE  
**Last Updated:** 2026-09-12  
**Development Timeline:** 6-9 months to launch

Built with clarity, compassion, and community. 🏆
