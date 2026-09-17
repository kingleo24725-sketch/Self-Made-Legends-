/**
 * Lead Submitter - Integration between Frontend Forms/Bot and Backend API
 * Handles submission of customer data to the SML_Final_Expense_Leads database
 */

class LeadSubmitter {
    constructor(apiEndpoint = 'http://localhost:3000') {
        this.apiEndpoint = apiEndpoint;
        this.submitEndpoint = `${apiEndpoint}/api/submit-lead`;
    }

    /**
     * Submit lead data to backend
     * @param {Object} leadData - Customer information
     * @returns {Promise} Response from backend
     */
    async submitLead(leadData) {
        try {
            // Validate required fields
            const requiredFields = [
                'age',
                'gender',
                'smoker_status',
                'health_conditions',
                'coverage_amount',
                'full_name',
                'phone_number',
                'email_address'
            ];

            for (let field of requiredFields) {
                if (!leadData[field]) {
                    return {
                        success: false,
                        message: `Missing required field: ${field}`,
                        error: true
                    };
                }
            }

            // Submit to backend
            const response = await fetch(this.submitEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(leadData)
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('Backend error:', result);
                return {
                    success: false,
                    message: result.message || 'Error submitting lead',
                    error: true
                };
            }

            console.log('Lead submitted successfully:', result);
            return {
                success: true,
                message: result.message,
                leadId: result.leadId,
                timestamp: result.timestamp,
                error: false
            };
        } catch (error) {
            console.error('Error submitting lead:', error);

            // Fallback to localStorage if backend unavailable
            console.log('Backend unavailable. Storing in localStorage.');
            return this.storeLocallyWithTimestamp(leadData);
        }
    }

    /**
     * Store lead locally when backend is unavailable
     * @param {Object} leadData - Customer information
     * @returns {Object} Result object
     */
    storeLocallyWithTimestamp(leadData) {
        try {
            const timestamp = new Date();
            const leadWithTimestamp = {
                ...leadData,
                timestamp: timestamp.toISOString(),
                stored_locally: true,
                stored_date: timestamp.toLocaleDateString('en-US')
            };

            // Get existing leads from localStorage
            let allLeads = [];
            const storedLeads = localStorage.getItem('sml_pending_leads');
            if (storedLeads) {
                allLeads = JSON.parse(storedLeads);
            }

            // Add new lead
            allLeads.push(leadWithTimestamp);

            // Save back to localStorage
            localStorage.setItem('sml_pending_leads', JSON.stringify(allLeads));

            return {
                success: true,
                message: 'Lead stored locally (offline mode)',
                stored_locally: true,
                timestamp: leadWithTimestamp.timestamp,
                error: false,
                note: 'Data will be synced to backend when connection is available'
            };
        } catch (error) {
            console.error('Error storing locally:', error);
            return {
                success: false,
                message: 'Error storing lead',
                error: true
            };
        }
    }

    /**
     * Get all pending leads stored locally
     * @returns {Array} Array of leads stored in localStorage
     */
    getPendingLeads() {
        try {
            const storedLeads = localStorage.getItem('sml_pending_leads');
            return storedLeads ? JSON.parse(storedLeads) : [];
        } catch (error) {
            console.error('Error retrieving pending leads:', error);
            return [];
        }
    }

    /**
     * Sync pending leads to backend
     * @returns {Promise} Sync result
     */
    async syncPendingLeads() {
        const pendingLeads = this.getPendingLeads();

        if (pendingLeads.length === 0) {
            return {
                success: true,
                message: 'No pending leads to sync',
                synced_count: 0
            };
        }

        let syncedCount = 0;
        const errors = [];

        for (let lead of pendingLeads) {
            try {
                // Remove local flags before submitting
                const { stored_locally, stored_date, ...cleanLead } = lead;

                const result = await this.submitLead(cleanLead);

                if (result.success) {
                    syncedCount++;
                } else {
                    errors.push({
                        lead_name: lead.full_name,
                        error: result.message
                    });
                }
            } catch (error) {
                errors.push({
                    lead_name: lead.full_name,
                    error: error.message
                });
            }
        }

        // Clear synced leads from localStorage
        if (syncedCount > 0) {
            const remainingLeads = pendingLeads.slice(syncedCount);
            if (remainingLeads.length > 0) {
                localStorage.setItem('sml_pending_leads', JSON.stringify(remainingLeads));
            } else {
                localStorage.removeItem('sml_pending_leads');
            }
        }

        return {
            success: errors.length === 0,
            synced_count: syncedCount,
            errors: errors,
            message: `Synced ${syncedCount} leads. ${errors.length} errors.`
        };
    }

    /**
     * Format lead data for submission
     * @param {Object} formData - Raw form data
     * @returns {Object} Formatted lead data
     */
    formatLeadData(formData) {
        return {
            age: String(formData.age).trim(),
            gender: String(formData.gender).trim(),
            smoker_status: String(formData.smoker_status).trim(),
            health_conditions: String(formData.health_conditions).trim(),
            coverage_amount: String(formData.coverage_amount).trim(),
            full_name: String(formData.full_name).trim(),
            phone_number: String(formData.phone_number).trim(),
            email_address: String(formData.email_address).trim()
        };
    }
}

// Export for use in browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeadSubmitter;
}
