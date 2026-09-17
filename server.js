const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Database directory
const DB_DIR = path.join(__dirname, 'SML_Final_Expense_Leads');
const LEADS_DIR = path.join(DB_DIR, 'leads');
const SUMMARIES_DIR = path.join(DB_DIR, 'summaries');

// Ensure directories exist
function ensureDirectoriesExist() {
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(LEADS_DIR)) {
        fs.mkdirSync(LEADS_DIR, { recursive: true });
    }
    if (!fs.existsSync(SUMMARIES_DIR)) {
        fs.mkdirSync(SUMMARIES_DIR, { recursive: true });
    }
}

// Initialize directories on startup
ensureDirectoriesExist();

/**
 * Store a new lead
 * @param {Object} leadData - Customer information
 * @returns {Object} Result of the operation
 */
function storeLead(leadData) {
    try {
        const timestamp = new Date();
        const leadObject = {
            age: leadData.age,
            gender: leadData.gender,
            smoker_status: leadData.smoker_status,
            health_conditions: leadData.health_conditions,
            coverage_amount: leadData.coverage_amount,
            full_name: leadData.full_name,
            phone_number: leadData.phone_number,
            email_address: leadData.email_address,
            timestamp: timestamp.toISOString(),
            submission_date: timestamp.toLocaleDateString('en-US'),
            submission_time: timestamp.toLocaleTimeString('en-US')
        };

        // Create filename based on timestamp
        const filename = `lead_${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}.json`;
        const filepath = path.join(LEADS_DIR, filename);

        // Write lead to file
        fs.writeFileSync(filepath, JSON.stringify(leadObject, null, 2));

        // Also append to master leads file for today
        updateMasterLeadsFile(leadObject);

        return {
            success: true,
            message: 'Lead stored successfully',
            leadId: filename.replace('.json', ''),
            timestamp: leadObject.timestamp
        };
    } catch (error) {
        console.error('Error storing lead:', error);
        return {
            success: false,
            message: 'Error storing lead',
            error: error.message
        };
    }
}

/**
 * Append lead to master leads file for the day
 */
function updateMasterLeadsFile(leadObject) {
    try {
        const today = new Date().toLocaleDateString('en-US').replace(/\//g, '-');
        const masterFilename = `all_leads_${today}.json`;
        const masterFilepath = path.join(LEADS_DIR, masterFilename);

        let leadsArray = [];

        // Read existing leads if file exists
        if (fs.existsSync(masterFilepath)) {
            const existingData = fs.readFileSync(masterFilepath, 'utf8');
            leadsArray = JSON.parse(existingData);
        }

        // Append new lead
        leadsArray.push(leadObject);

        // Write back to file
        fs.writeFileSync(masterFilepath, JSON.stringify(leadsArray, null, 2));
    } catch (error) {
        console.error('Error updating master leads file:', error);
    }
}

/**
 * Generate daily summary report
 */
function generateDailySummary(dateString = null) {
    try {
        const date = dateString ? new Date(dateString) : new Date();
        const formattedDate = date.toLocaleDateString('en-US').replace(/\//g, '-');
        const masterFilename = `all_leads_${formattedDate}.json`;
        const masterFilepath = path.join(LEADS_DIR, masterFilename);

        if (!fs.existsSync(masterFilepath)) {
            return {
                success: false,
                message: `No leads found for ${formattedDate}`,
                date: formattedDate,
                total_leads: 0,
                leads: []
            };
        }

        const leadsData = JSON.parse(fs.readFileSync(masterFilepath, 'utf8'));

        // Create summary
        const summary = {
            date: formattedDate,
            report_generated: new Date().toISOString(),
            total_leads: leadsData.length,
            leads: leadsData.map(lead => ({
                full_name: lead.full_name,
                age: lead.age,
                coverage_amount: lead.coverage_amount,
                phone_number: lead.phone_number,
                email_address: lead.email_address,
                submission_time: lead.submission_time
            }))
        };

        // Save summary
        const summaryFilename = `summary_${formattedDate}.json`;
        const summaryFilepath = path.join(SUMMARIES_DIR, summaryFilename);
        fs.writeFileSync(summaryFilepath, JSON.stringify(summary, null, 2));

        return {
            success: true,
            message: 'Daily summary generated',
            ...summary
        };
    } catch (error) {
        console.error('Error generating daily summary:', error);
        return {
            success: false,
            message: 'Error generating summary',
            error: error.message
        };
    }
}

/**
 * Get all leads for a specific date
 */
function getLeadsForDate(dateString) {
    try {
        const formattedDate = new Date(dateString).toLocaleDateString('en-US').replace(/\//g, '-');
        const masterFilename = `all_leads_${formattedDate}.json`;
        const masterFilepath = path.join(LEADS_DIR, masterFilename);

        if (!fs.existsSync(masterFilepath)) {
            return {
                success: false,
                message: `No leads found for ${formattedDate}`,
                date: formattedDate,
                leads: []
            };
        }

        const leadsData = JSON.parse(fs.readFileSync(masterFilepath, 'utf8'));

        return {
            success: true,
            date: formattedDate,
            total_leads: leadsData.length,
            leads: leadsData
        };
    } catch (error) {
        console.error('Error retrieving leads:', error);
        return {
            success: false,
            message: 'Error retrieving leads',
            error: error.message
        };
    }
}

/**
 * Get all leads (all time)
 */
function getAllLeads() {
    try {
        const leads = [];
        const files = fs.readdirSync(LEADS_DIR);

        files.forEach(file => {
            if (file.startsWith('all_leads_') && file.endsWith('.json')) {
                const filepath = path.join(LEADS_DIR, file);
                const fileData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                leads.push(...fileData);
            }
        });

        // Sort by timestamp descending (newest first)
        leads.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return {
            success: true,
            total_leads: leads.length,
            leads: leads
        };
    } catch (error) {
        console.error('Error retrieving all leads:', error);
        return {
            success: false,
            message: 'Error retrieving leads',
            error: error.message
        };
    }
}

// API Endpoints

/**
 * POST /api/submit-lead
 * Accept lead data from forms or bot
 */
app.post('/api/submit-lead', (req, res) => {
    try {
        const leadData = req.body;

        // Validate required fields
        const requiredFields = ['age', 'gender', 'smoker_status', 'health_conditions', 'coverage_amount', 'full_name', 'phone_number', 'email_address'];
        const missingFields = requiredFields.filter(field => !leadData[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                missing_fields: missingFields
            });
        }

        const result = storeLead(leadData);
        res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
        console.error('Error in submit-lead endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

/**
 * GET /api/daily-summary
 * Get daily summary for a specific date or today
 */
app.get('/api/daily-summary', (req, res) => {
    try {
        const date = req.query.date;
        const summary = generateDailySummary(date);
        res.status(summary.success ? 200 : 404).json(summary);
    } catch (error) {
        console.error('Error in daily-summary endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

/**
 * GET /api/leads/date
 * Get all leads for a specific date
 */
app.get('/api/leads/date', (req, res) => {
    try {
        const date = req.query.date;
        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Date parameter required'
            });
        }
        const result = getLeadsForDate(date);
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        console.error('Error in leads/date endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

/**
 * GET /api/leads/all
 * Get all leads
 */
app.get('/api/leads/all', (req, res) => {
    try {
        const result = getAllLeads();
        res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
        console.error('Error in leads/all endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

/**
 * GET /api/leads/count
 * Get total count of leads
 */
app.get('/api/leads/count', (req, res) => {
    try {
        const result = getAllLeads();
        res.json({
            success: true,
            total_leads: result.total_leads
        });
    } catch (error) {
        console.error('Error in leads/count endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

/**
 * GET /api/status
 * Server status and database info
 */
app.get('/api/status', (req, res) => {
    try {
        const allLeads = getAllLeads();
        const today = new Date().toLocaleDateString('en-US').replace(/\//g, '-');
        const todaysLeads = getLeadsForDate(today);

        res.json({
            status: 'running',
            timestamp: new Date().toISOString(),
            database_location: DB_DIR,
            total_leads_all_time: allLeads.total_leads,
            leads_today: todaysLeads.success ? todaysLeads.total_leads : 0,
            storage: {
                leads_directory: LEADS_DIR,
                summaries_directory: SUMMARIES_DIR
            }
        });
    } catch (error) {
        console.error('Error in status endpoint:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error retrieving status',
            error: error.message
        });
    }
});

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/agent-bot', (req, res) => {
    res.sendFile(path.join(__dirname, 'agent-bot.html'));
});

app.get('/underwriting-form', (req, res) => {
    res.sendFile(path.join(__dirname, 'underwriting-form.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🏆 Self-Made Legends Backend Server Running`);
    console.log(`📍 Server: http://localhost:${PORT}`);
    console.log(`📁 Database: ${DB_DIR}`);
    console.log(`\n📊 API Endpoints:`);
    console.log(`  POST   /api/submit-lead         - Submit a new lead`);
    console.log(`  GET    /api/daily-summary       - Get daily summary (with ?date=YYYY-MM-DD)`);
    console.log(`  GET    /api/leads/all           - Get all leads`);
    console.log(`  GET    /api/leads/date          - Get leads by date (with ?date=YYYY-MM-DD)`);
    console.log(`  GET    /api/leads/count         - Get total lead count`);
    console.log(`  GET    /api/status              - Server status\n`);
});

module.exports = app;
