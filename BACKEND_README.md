# Self-Made Legends Final Expense Insurance - Backend System

## Overview

This backend system handles lead storage and organization for Final Expense Life Insurance quote requests. It collects customer information from the underwriting form and AI Agent Bot, stores them in a structured JSON format, and generates daily summary reports.

## Directory Structure

```
SML_Final_Expense_Leads/
├── leads/
│   ├── lead_[timestamp]_[random].json      # Individual lead files
│   └── all_leads_[YYYY-MM-DD].json         # Daily consolidated leads
└── summaries/
    └── summary_[YYYY-MM-DD].json           # Daily summary reports
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```

   The server will start at `http://localhost:3000`

3. **Expected Output**
   ```
   🏆 Self-Made Legends Backend Server Running
   📍 Server: http://localhost:3000
   📁 Database: [path]/SML_Final_Expense_Leads
   ...
   ```

## API Endpoints

### 1. Submit a New Lead
**POST** `/api/submit-lead`

Submit customer information from the underwriting form or AI Agent Bot.

**Request Body:**
```json
{
  "age": "45",
  "gender": "Male",
  "smoker_status": "No",
  "health_conditions": "No",
  "coverage_amount": "$25,000",
  "full_name": "John Smith",
  "phone_number": "555-123-4567",
  "email_address": "john@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Lead stored successfully",
  "leadId": "lead_1234567890_abc123def",
  "timestamp": "2024-01-15T14:30:00.000Z"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Missing required fields",
  "missing_fields": ["email_address"]
}
```

### 2. Get Daily Summary
**GET** `/api/daily-summary?date=YYYY-MM-DD`

Get a summary of all leads collected on a specific day.

**Query Parameters:**
- `date` (optional): Date in format YYYY-MM-DD. Defaults to today.

**Response:**
```json
{
  "success": true,
  "date": "2024-01-15",
  "report_generated": "2024-01-15T15:00:00.000Z",
  "total_leads": 3,
  "leads": [
    {
      "full_name": "John Smith",
      "age": "45",
      "coverage_amount": "$25,000",
      "phone_number": "555-123-4567",
      "email_address": "john@example.com",
      "submission_time": "2:30:45 PM"
    },
    ...
  ]
}
```

### 3. Get All Leads for a Specific Date
**GET** `/api/leads/date?date=YYYY-MM-DD`

Retrieve complete lead data for a specific date.

**Query Parameters:**
- `date` (required): Date in format YYYY-MM-DD

**Response:**
```json
{
  "success": true,
  "date": "2024-01-15",
  "total_leads": 3,
  "leads": [
    {
      "age": "45",
      "gender": "Male",
      "smoker_status": "No",
      "health_conditions": "No",
      "coverage_amount": "$25,000",
      "full_name": "John Smith",
      "phone_number": "555-123-4567",
      "email_address": "john@example.com",
      "timestamp": "2024-01-15T14:30:00.000Z",
      "submission_date": "01/15/2024",
      "submission_time": "2:30:45 PM"
    },
    ...
  ]
}
```

### 4. Get All Leads (All Time)
**GET** `/api/leads/all`

Retrieve all leads ever submitted, sorted by newest first.

**Response:**
```json
{
  "success": true,
  "total_leads": 15,
  "leads": [
    {
      "age": "52",
      "gender": "Female",
      "smoker_status": "Yes",
      "health_conditions": "Yes",
      "coverage_amount": "$15,000",
      "full_name": "Mary Johnson",
      "phone_number": "555-987-6543",
      "email_address": "mary@example.com",
      "timestamp": "2024-01-15T15:45:00.000Z",
      ...
    },
    ...
  ]
}
```

### 5. Get Total Lead Count
**GET** `/api/leads/count`

Get the total number of leads submitted.

**Response:**
```json
{
  "success": true,
  "total_leads": 15
}
```

### 6. Server Status
**GET** `/api/status`

Get current server status and database information.

**Response:**
```json
{
  "status": "running",
  "timestamp": "2024-01-15T15:00:00.000Z",
  "database_location": "/path/to/SML_Final_Expense_Leads",
  "total_leads_all_time": 15,
  "leads_today": 3,
  "storage": {
    "leads_directory": "/path/to/SML_Final_Expense_Leads/leads",
    "summaries_directory": "/path/to/SML_Final_Expense_Leads/summaries"
  }
}
```

## Using the LeadSubmitter Class

### In Frontend Code (HTML/JavaScript)

1. **Include the script:**
   ```html
   <script src="lead-submitter.js"></script>
   ```

2. **Create an instance:**
   ```javascript
   const submitter = new LeadSubmitter('http://localhost:3000');
   ```

3. **Submit a lead:**
   ```javascript
   const leadData = {
     age: '45',
     gender: 'Male',
     smoker_status: 'No',
     health_conditions: 'No',
     coverage_amount: '$25,000',
     full_name: 'John Smith',
     phone_number: '555-123-4567',
     email_address: 'john@example.com'
   };

   submitter.submitLead(leadData).then(result => {
     if (result.success) {
       console.log('Lead submitted:', result.leadId);
     } else {
       console.log('Error:', result.message);
     }
   });
   ```

### Offline Mode

If the backend is unavailable, leads are automatically stored locally in localStorage. When the backend comes back online, call:

```javascript
submitter.syncPendingLeads().then(result => {
  console.log(`Synced ${result.synced_count} leads`);
});
```

## Integration with Frontend Forms

### Underwriting Form Integration

Add this to `underwriting-form.html` in the success section:

```javascript
// After form validation and data collection
const submitter = new LeadSubmitter('http://localhost:3000');

submitter.submitLead(formData).then(result => {
  if (result.success) {
    console.log('Lead stored in database');
  } else {
    console.log('Stored locally (backend unavailable)');
  }
});
```

### Agent Bot Integration

Add this to `agent-bot.html` when completing the conversation:

```javascript
const submitter = new LeadSubmitter('http://localhost:3000');

submitter.submitLead(botData).then(result => {
  if (result.success) {
    console.log('Lead stored in database');
  } else {
    console.log('Stored locally (backend unavailable)');
  }
});
```

## Data Storage Details

### Individual Lead Files

Each submission creates a unique JSON file with timestamp and random ID:
```
lead_1705338600000_abc123def.json
```

**Contents:**
```json
{
  "age": "45",
  "gender": "Male",
  "smoker_status": "No",
  "health_conditions": "No",
  "coverage_amount": "$25,000",
  "full_name": "John Smith",
  "phone_number": "555-123-4567",
  "email_address": "john@example.com",
  "timestamp": "2024-01-15T14:30:00.000Z",
  "submission_date": "01/15/2024",
  "submission_time": "2:30:45 PM"
}
```

### Daily Consolidated Files

All leads for a day are stored in one file:
```
all_leads_2024-01-15.json
```

This file is automatically appended to when new leads arrive, preventing data loss.

### Daily Summary Reports

```
summary_2024-01-15.json
```

**Contents:**
```json
{
  "date": "2024-01-15",
  "report_generated": "2024-01-15T16:00:00.000Z",
  "total_leads": 3,
  "leads": [
    {
      "full_name": "John Smith",
      "age": "45",
      "coverage_amount": "$25,000",
      "phone_number": "555-123-4567",
      "email_address": "john@example.com",
      "submission_time": "2:30:45 PM"
    }
  ]
}
```

## Important Notes

1. **No Underwriting Decisions**: The backend only stores and organizes data. It does not:
   - Calculate premiums
   - Make approval decisions
   - Assess risk
   - Generate quotes

2. **Data Validation**: All required fields must be present. Missing fields will result in an error.

3. **Timestamps**: All submissions include:
   - ISO 8601 timestamp (2024-01-15T14:30:00.000Z)
   - Submission date (01/15/2024)
   - Submission time (2:30:45 PM)

4. **Backup**: Individual lead files are created as backups. The daily consolidated file is the primary record.

5. **No Overwriting**: Each new lead is appended to the daily file. Existing data is never overwritten.

## Troubleshooting

### Server Won't Start
- Ensure Node.js is installed: `node --version`
- Check port 3000 isn't already in use
- Run with a different port: `PORT=3001 npm start`

### Database Directory Not Created
- Server will automatically create directories on startup
- Check write permissions in the project directory

### Backend Unavailable
- Leads are automatically stored locally in localStorage
- When backend is available, call `syncPendingLeads()` to sync

### CORS Errors
- CORS is enabled by default for all origins
- Modify `server.js` if you need to restrict origins

## Example Usage

### Using cURL to Submit a Lead

```bash
curl -X POST http://localhost:3000/api/submit-lead \
  -H "Content-Type: application/json" \
  -d '{
    "age": "45",
    "gender": "Male",
    "smoker_status": "No",
    "health_conditions": "No",
    "coverage_amount": "$25,000",
    "full_name": "John Smith",
    "phone_number": "555-123-4567",
    "email_address": "john@example.com"
  }'
```

### Get Today's Summary

```bash
curl http://localhost:3000/api/daily-summary
```

### Get Leads for Specific Date

```bash
curl "http://localhost:3000/api/leads/date?date=2024-01-15"
```

## Support

For issues or questions about the backend system, check:
1. Server status: `GET /api/status`
2. Console logs for error messages
3. File permissions in SML_Final_Expense_Leads directory
4. Network connectivity to the backend server

---

**Self-Made Legends Life & Legacy Insurance Co.**
*Building legacy. Protecting families. Inspired by excellence.*
