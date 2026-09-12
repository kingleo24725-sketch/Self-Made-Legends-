/**
 * Motherboard AI - Central Rules Engine & Logging Hub
 * Self-Made Legends Life & Legacy Insurance Co.
 *
 * This is the central nervous system that all Child Bots reference.
 * It stores rules, patterns, definitions, and guardrails.
 * It does NOT make final decisions - it only analyzes and suggests improvements.
 */

class MotherboardAI {
    constructor() {
        this.version = "1.0.0";
        this.created_at = new Date().toISOString();
        this.logs = [];
        this.improvement_suggestions = [];

        // UNDERWRITING RULES
        this.underwriting_rules = {
            age_minimum: 40,
            age_maximum: 85,
            coverage_minimum: 5000,
            coverage_maximum: 25000,
            coverage_increments: 5000,
            approved_coverage_amounts: [5000, 10000, 15000, 20000, 25000],

            risk_factors: {
                age_40_49: { base_score: 20, weight: 0.15 },
                age_50_59: { base_score: 35, weight: 0.20 },
                age_60_69: { base_score: 50, weight: 0.25 },
                age_70_79: { base_score: 65, weight: 0.30 },
                age_80_85: { base_score: 80, weight: 0.35 },
                smoker_yes: { risk_increase: 25, weight: 0.20 },
                smoker_no: { risk_increase: 0, weight: 0.20 },
                health_conditions_yes: { risk_increase: 30, weight: 0.25 },
                health_conditions_no: { risk_increase: 0, weight: 0.25 },
            },

            thresholds: {
                approve_max_score: 50,
                review_min_score: 50,
                review_max_score: 75,
                decline_min_score: 75,
            },

            approval_rules: [
                "Age must be between 40 and 85",
                "Coverage amount must be valid ($5,000-$25,000)",
                "All required fields must be provided",
                "Risk score must be calculated",
                "No pending disputes or fraud flags"
            ]
        };

        // CLAIMS RULES
        this.claims_rules = {
            required_documents: [
                "Valid death certificate",
                "Policy documentation",
                "Beneficiary identification",
                "Claim form (signed)"
            ],

            death_certificate_requirements: {
                must_be_official: true,
                must_include_date: true,
                must_include_cause: true,
                days_to_expire: 365
            },

            waiting_periods: {
                suicide_exclusion_months: 2,
                contestability_period_months: 2
            },

            claim_processing_steps: [
                "1. Validate death certificate",
                "2. Verify policy is active",
                "3. Check beneficiary information",
                "4. Review for fraud indicators",
                "5. Verify no exclusions apply",
                "6. Calculate benefit amount",
                "7. Prepare for human approval"
            ],

            benefit_calculation: {
                policy_type: "Final Expense",
                coverage_amounts: [5000, 10000, 15000, 20000, 25000],
                payment_method: "Direct to beneficiary"
            }
        };

        // COMPLIANCE RULES
        this.compliance_rules = {
            marketing_restrictions: [
                "Cannot guarantee approval",
                "Cannot promise specific rates",
                "Must disclose no medical exam",
                "Must include age range",
                "Must include coverage range",
                "Cannot make medical claims"
            ],

            content_requirements: {
                must_include_disclaimer: true,
                must_include_contact_info: true,
                must_be_clear_language: true,
                must_avoid_legal_jargon: true
            },

            bot_guardrails: [
                "Bots must not make final decisions",
                "Bots must not override rules",
                "Bots must not make promises",
                "Bots must not approve claims",
                "Bots must collect data only",
                "Bots must reference Motherboard rules",
                "All decisions require human review"
            ],

            prohibited_phrases: [
                "guaranteed approval",
                "you will be approved",
                "we promise",
                "we guarantee",
                "instant approval",
                "no questions asked",
                "medical advice"
            ]
        };

        // FRAUD PATTERNS & DETECTION
        this.fraud_patterns = {
            high_risk_indicators: [
                "Multiple applications same day",
                "Age boundary applicants (80-85)",
                "Maximum coverage requests",
                "Smoker + health conditions + max coverage",
                "Recent policy date + death claim",
                "Mismatched beneficiary information",
                "Inconsistent contact information",
                "Rapid claim after approval"
            ],

            medium_risk_indicators: [
                "Age 70+",
                "Smoker status",
                "Existing health conditions",
                "Large coverage amount",
                "Inconsistent phone/email patterns"
            ],

            low_risk_indicators: [
                "Age 40-59",
                "Non-smoker",
                "No health conditions",
                "Standard coverage amount",
                "Consistent information"
            ],

            fraud_score_calculation: {
                high_risk_per_indicator: 15,
                medium_risk_per_indicator: 8,
                low_risk_per_indicator: 2,
                max_score: 100
            }
        };

        // PRODUCT DEFINITIONS
        this.product_definitions = {
            final_expense_insurance: {
                name: "Final Expense Life Insurance",
                description: "Helps family cover funeral costs, burial expenses, and small debts",
                coverage_range: "$5,000 to $25,000",
                age_range: "40 to 85 years old",
                key_features: [
                    "No medical exam required",
                    "Simple application process",
                    "Fast approval",
                    "Covers funeral and burial costs",
                    "Covers small outstanding debts"
                ],
                exclusions: [
                    "Suicide within 2 months",
                    "Death during contestability period",
                    "Policy lapsed due to non-payment"
                ],
                premium_factors: [
                    "Age",
                    "Smoking status",
                    "Health conditions",
                    "Coverage amount"
                ]
            },

            coverage_amounts: [5000, 10000, 15000, 20000, 25000],

            eligibility_criteria: {
                minimum_age: 40,
                maximum_age: 85,
                citizenship: "US resident",
                medical_exam: false,
                waiting_period: "2 months (suicide exclusion)"
            }
        };

        // GUARDRAILS - Hard constraints that cannot be violated
        this.guardrails = {
            system_rules: [
                "Motherboard is read-only for bots (no rule modifications)",
                "All decisions logged with timestamp",
                "No bot shall make final approval/denial",
                "All data encrypted in transit",
                "Audit trail maintained for all actions",
                "Compliance checks mandatory before output"
            ],

            decision_authority: {
                agent_bot: ["collect_data", "answer_questions"],
                underwriting_bot: ["score_applications", "suggest_recommendation"],
                claims_bot: ["collect_documents", "analyze_claim"],
                fraud_bot: ["analyze_patterns", "calculate_score"],
                compliance_bot: ["check_content", "suggest_corrections"],
                customer_service_bot: ["answer_questions", "collect_inquiries"],
                human_authority: ["approve_applications", "approve_claims", "modify_rules", "override_bots"]
            },

            prohibited_bot_actions: [
                "Making final approval decisions",
                "Making final denial decisions",
                "Approving claims",
                "Overriding Motherboard rules",
                "Modifying compliance rules",
                "Promising coverage",
                "Making legal statements",
                "Guaranteeing approval"
            ]
        };
    }

    /**
     * Log data from Child Bots
     * @param {string} bot_name - Name of the bot sending log
     * @param {string} log_type - Type of log (application, claim, fraud, compliance, support)
     * @param {Object} data - Data to log
     * @returns {Object} Log entry
     */
    logFromBot(bot_name, log_type, data) {
        const log_entry = {
            timestamp: new Date().toISOString(),
            bot_name: bot_name,
            log_type: log_type,
            data: data,
            log_id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        this.logs.push(log_entry);

        // Store to localStorage for persistence
        this.persistLogs();

        console.log(`✓ Logged from ${bot_name}:`, log_entry.log_id);

        return log_entry;
    }

    /**
     * Analyze logs for patterns and improvements
     * @returns {Array} Array of improvement suggestions
     */
    analyzeForImprovements() {
        const suggestions = [];

        // Analyze approval rates
        const underwriting_logs = this.logs.filter(l => l.log_type === 'underwriting');
        if (underwriting_logs.length > 0) {
            const review_rate = underwriting_logs.filter(l => l.data.recommendation === 'review').length / underwriting_logs.length;
            if (review_rate > 0.5) {
                suggestions.push({
                    category: "underwriting",
                    severity: "medium",
                    suggestion: `High review rate (${(review_rate * 100).toFixed(1)}%). Consider adjusting risk thresholds for better approval rate efficiency.`,
                    requires_approval: true
                });
            }
        }

        // Analyze fraud detection
        const fraud_logs = this.logs.filter(l => l.log_type === 'fraud');
        if (fraud_logs.length > 0) {
            const high_risk_rate = fraud_logs.filter(l => l.data.risk_label === 'high risk').length / fraud_logs.length;
            if (high_risk_rate > 0.2) {
                suggestions.push({
                    category: "fraud",
                    severity: "high",
                    suggestion: `High fraud risk detection rate (${(high_risk_rate * 100).toFixed(1)}%). Review fraud patterns and consider manual review protocol.`,
                    requires_approval: true
                });
            }
        }

        // Analyze compliance issues
        const compliance_logs = this.logs.filter(l => l.log_type === 'compliance');
        if (compliance_logs.length > 0) {
            const violation_rate = compliance_logs.filter(l => l.data.compliance_status === 'violation').length / compliance_logs.length;
            if (violation_rate > 0) {
                suggestions.push({
                    category: "compliance",
                    severity: "critical",
                    suggestion: `Compliance violations detected. Review and update content immediately. ${violation_rate * 100}% failure rate.`,
                    requires_approval: true
                });
            }
        }

        this.improvement_suggestions = suggestions;
        return suggestions;
    }

    /**
     * Get rule by category
     * @param {string} category - Rule category (underwriting, claims, compliance, etc)
     * @returns {Object} Rules for the category
     */
    getRule(category) {
        const rules_map = {
            underwriting: this.underwriting_rules,
            claims: this.claims_rules,
            compliance: this.compliance_rules,
            fraud: this.fraud_patterns,
            product: this.product_definitions,
            guardrails: this.guardrails
        };

        return rules_map[category] || null;
    }

    /**
     * Verify bot action is allowed by guardrails
     * @param {string} bot_name - Name of bot
     * @param {string} action - Action to verify
     * @returns {Object} Verification result
     */
    verifyBotAction(bot_name, action) {
        const allowed_actions = this.guardrails.decision_authority[bot_name] || [];
        const is_allowed = allowed_actions.includes(action);

        if (!is_allowed) {
            console.warn(`⚠ Bot ${bot_name} attempted unauthorized action: ${action}`);
        }

        return {
            bot_name: bot_name,
            action: action,
            is_allowed: is_allowed,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Check if content violates compliance rules
     * @param {string} content - Content to check
     * @returns {Object} Compliance check result
     */
    checkCompliance(content) {
        const violations = [];
        const content_lower = content.toLowerCase();

        // Check for prohibited phrases
        this.compliance_rules.prohibited_phrases.forEach(phrase => {
            if (content_lower.includes(phrase.toLowerCase())) {
                violations.push({
                    violation: "Prohibited phrase detected",
                    phrase: phrase,
                    location: content_lower.indexOf(phrase.toLowerCase())
                });
            }
        });

        return {
            compliance_status: violations.length === 0 ? 'pass' : 'violation',
            violations_count: violations.length,
            violations: violations,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Persist logs to localStorage
     */
    persistLogs() {
        try {
            const logs_to_save = this.logs.slice(-1000); // Keep last 1000 logs
            localStorage.setItem('SML_AI_Logs', JSON.stringify({
                saved_at: new Date().toISOString(),
                total_logs: this.logs.length,
                logs: logs_to_save
            }));
        } catch (error) {
            console.error('Error persisting logs:', error);
        }
    }

    /**
     * Generate daily report
     * @returns {Object} Daily report
     */
    generateDailyReport() {
        const today = new Date().toLocaleDateString('en-US');
        const today_logs = this.logs.filter(log => {
            const log_date = new Date(log.timestamp).toLocaleDateString('en-US');
            return log_date === today;
        });

        const report = {
            date: today,
            generated_at: new Date().toISOString(),
            total_logs: today_logs.length,
            by_type: {
                applications: today_logs.filter(l => l.log_type === 'application').length,
                underwriting: today_logs.filter(l => l.log_type === 'underwriting').length,
                claims: today_logs.filter(l => l.log_type === 'claims').length,
                fraud: today_logs.filter(l => l.log_type === 'fraud').length,
                compliance: today_logs.filter(l => l.log_type === 'compliance').length,
                support: today_logs.filter(l => l.log_type === 'support').length
            },
            improvements_suggested: this.improvement_suggestions.length,
            critical_issues: this.improvement_suggestions.filter(s => s.severity === 'critical').length
        };

        return report;
    }

    /**
     * Export system status
     * @returns {Object} System status
     */
    getSystemStatus() {
        return {
            version: this.version,
            created_at: this.created_at,
            current_time: new Date().toISOString(),
            total_logs: this.logs.length,
            total_suggestions: this.improvement_suggestions.length,
            critical_issues: this.improvement_suggestions.filter(s => s.severity === 'critical').length,
            rules_loaded: {
                underwriting: !!this.underwriting_rules,
                claims: !!this.claims_rules,
                compliance: !!this.compliance_rules,
                fraud_patterns: !!this.fraud_patterns,
                product_definitions: !!this.product_definitions,
                guardrails: !!this.guardrails
            }
        };
    }
}

// Export for use in Node.js and Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MotherboardAI;
}

// Create global instance
const MOTHERBOARD = new MotherboardAI();
