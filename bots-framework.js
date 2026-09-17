/**
 * Bots Framework - Shared functions for all Child Bots
 * Self-Made Legends Life & Legacy Insurance Co.
 */

class BotFramework {
    constructor(bot_name) {
        this.bot_name = bot_name;
        this.motherboard = MOTHERBOARD; // Reference to Motherboard
        this.created_at = new Date().toISOString();
    }

    /**
     * Log action to Motherboard
     * @param {string} log_type - Type of log
     * @param {Object} data - Data to log
     * @returns {Object} Log entry
     */
    logToMotherboard(log_type, data) {
        return this.motherboard.logFromBot(this.bot_name, log_type, data);
    }

    /**
     * Verify action is allowed
     * @param {string} action - Action to verify
     * @returns {boolean} Is allowed
     */
    verifyAction(action) {
        const verification = this.motherboard.verifyBotAction(this.bot_name, action);
        return verification.is_allowed;
    }

    /**
     * Get rules from Motherboard
     * @param {string} category - Rule category
     * @returns {Object} Rules
     */
    getRules(category) {
        return this.motherboard.getRule(category);
    }

    /**
     * Format JSON response
     * @param {Object} data - Data to format
     * @returns {string} Formatted JSON
     */
    formatJSON(data) {
        return JSON.stringify(data, null, 2);
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    generateID() {
        return `${this.bot_name.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * Agent Bot - Collects customer qualification information
 */
class AgentBot extends BotFramework {
    constructor() {
        super('Agent Bot');
        this.greeting = `Hello, I'm your Final Expense Insurance Assistant. I'm here to help you see how much coverage you may qualify for to help your family with funeral and burial costs. This type of insurance is simple, affordable, and requires no medical exam. I'll ask you a few quick questions to get started.`;
    }

    /**
     * Process qualification conversation
     * @param {Object} answers - User answers from conversation
     * @returns {Object} Formatted application data
     */
    processApplication(answers) {
        // Verify action is allowed
        if (!this.verifyAction('collect_data')) {
            return { error: 'Action not authorized' };
        }

        const application_data = {
            application_id: this.generateID(),
            age: answers.age,
            gender: answers.gender,
            smoker_status: answers.smoker_status,
            health_conditions: answers.health_conditions,
            coverage_amount: answers.coverage_amount,
            full_name: answers.full_name,
            phone_number: answers.phone_number,
            email_address: answers.email_address,
            submission_timestamp: new Date().toISOString(),
            submission_date: new Date().toLocaleDateString('en-US')
        };

        // Log to Motherboard
        this.logToMotherboard('application', {
            application_id: application_data.application_id,
            status: 'submitted',
            fields_collected: Object.keys(application_data).length,
            timestamp: new Date().toISOString()
        });

        return application_data;
    }

    /**
     * Get greeting message
     * @returns {string} Greeting
     */
    getGreeting() {
        return this.greeting;
    }
}

/**
 * Underwriting Bot - Applies underwriting rules and scores applications
 */
class UnderwritingBot extends BotFramework {
    constructor() {
        super('Underwriting Bot');
    }

    /**
     * Score an application based on Motherboard rules
     * @param {Object} application - Application data from Agent Bot
     * @returns {Object} Underwriting assessment
     */
    scoreApplication(application) {
        // Verify action is allowed
        if (!this.verifyAction('score_applications')) {
            return { error: 'Action not authorized' };
        }

        const underwriting_rules = this.getRules('underwriting');

        // Initial validation
        if (application.age < underwriting_rules.age_minimum || application.age > underwriting_rules.age_maximum) {
            return {
                assessment_id: this.generateID(),
                application_id: application.application_id,
                risk_score: 100,
                recommendation: 'decline',
                reason: `Age ${application.age} outside eligibility range (40-85)`,
                timestamp: new Date().toISOString()
            };
        }

        // Calculate risk score based on factors
        let risk_score = 0;

        // Age factor
        if (application.age >= 40 && application.age <= 49) {
            risk_score += underwriting_rules.risk_factors.age_40_49.base_score;
        } else if (application.age >= 50 && application.age <= 59) {
            risk_score += underwriting_rules.risk_factors.age_50_59.base_score;
        } else if (application.age >= 60 && application.age <= 69) {
            risk_score += underwriting_rules.risk_factors.age_60_69.base_score;
        } else if (application.age >= 70 && application.age <= 79) {
            risk_score += underwriting_rules.risk_factors.age_70_79.base_score;
        } else if (application.age >= 80 && application.age <= 85) {
            risk_score += underwriting_rules.risk_factors.age_80_85.base_score;
        }

        // Smoking factor
        if (application.smoker_status.toLowerCase() === 'yes') {
            risk_score += underwriting_rules.risk_factors.smoker_yes.risk_increase;
        }

        // Health conditions factor
        if (application.health_conditions.toLowerCase() === 'yes') {
            risk_score += underwriting_rules.risk_factors.health_conditions_yes.risk_increase;
        }

        // Cap at 100
        risk_score = Math.min(risk_score, 100);

        // Generate recommendation based on thresholds
        let recommendation = 'review';
        if (risk_score <= underwriting_rules.thresholds.approve_max_score) {
            recommendation = 'approve';
        } else if (risk_score >= underwriting_rules.thresholds.decline_min_score) {
            recommendation = 'decline';
        }

        const assessment = {
            assessment_id: this.generateID(),
            application_id: application.application_id,
            age: application.age,
            gender: application.gender,
            smoker_status: application.smoker_status,
            health_conditions: application.health_conditions,
            coverage_amount: application.coverage_amount,
            risk_score: risk_score,
            recommendation: recommendation,
            note: `Recommendation is ${recommendation} - requires human review and approval before any action`,
            timestamp: new Date().toISOString()
        };

        // Log to Motherboard
        this.logToMotherboard('underwriting', assessment);

        return assessment;
    }
}

/**
 * Claims Bot - Processes claim submissions and collects documentation
 */
class ClaimsBot extends BotFramework {
    constructor() {
        super('Claims Bot');
    }

    /**
     * Process claim submission
     * @param {Object} claim_info - Claim information
     * @returns {Object} Claim assessment
     */
    processClaim(claim_info) {
        // Verify action is allowed
        if (!this.verifyAction('collect_documents')) {
            return { error: 'Action not authorized' };
        }

        const claims_rules = this.getRules('claims');

        // Check for required documents
        const required_docs = claims_rules.required_documents;
        const docs_received = claim_info.documents || [];
        const missing_docs = required_docs.filter(doc => !docs_received.includes(doc));

        // Determine review status
        let claims_review_status = 'valid';
        if (missing_docs.length > 0) {
            claims_review_status = 'needs review';
        }

        const claim_assessment = {
            claim_id: this.generateID(),
            policy_id: claim_info.policy_id,
            beneficiary_name: claim_info.beneficiary_name,
            death_certificate_status: claim_info.death_certificate_status || 'not received',
            documents_received: docs_received.length,
            missing_documents: missing_docs,
            fraud_score: 0, // Will be updated by Fraud Bot
            claims_review_status: claims_review_status,
            note: `Claim status is ${claims_review_status} - requires human review before approval`,
            timestamp: new Date().toISOString()
        };

        // Log to Motherboard
        this.logToMotherboard('claims', claim_assessment);

        return claim_assessment;
    }
}

/**
 * Fraud Bot - Analyzes patterns for fraud risk
 */
class FraudBot extends BotFramework {
    constructor() {
        super('Fraud Bot');
    }

    /**
     * Analyze for fraud patterns
     * @param {Object} application_or_claim - Data to analyze
     * @returns {Object} Fraud assessment
     */
    analyzeFraudRisk(application_or_claim) {
        // Verify action is allowed
        if (!this.verifyAction('analyze_patterns')) {
            return { error: 'Action not authorized' };
        }

        const fraud_patterns = this.getRules('fraud');
        let fraud_score = 0;
        const anomalies = [];

        // Check for high-risk indicators
        fraud_patterns.high_risk_indicators.forEach(indicator => {
            if (this.checkIndicator(application_or_claim, indicator)) {
                fraud_score += fraud_patterns.fraud_score_calculation.high_risk_per_indicator;
                anomalies.push({
                    type: 'high_risk',
                    indicator: indicator
                });
            }
        });

        // Check for medium-risk indicators
        fraud_patterns.medium_risk_indicators.forEach(indicator => {
            if (this.checkIndicator(application_or_claim, indicator)) {
                fraud_score += fraud_patterns.fraud_score_calculation.medium_risk_per_indicator;
                anomalies.push({
                    type: 'medium_risk',
                    indicator: indicator
                });
            }
        });

        // Cap at 100
        fraud_score = Math.min(fraud_score, 100);

        // Determine risk label
        let risk_label = 'low risk';
        if (fraud_score >= 60) {
            risk_label = 'high risk';
        } else if (fraud_score >= 30) {
            risk_label = 'medium risk';
        }

        const fraud_assessment = {
            assessment_id: this.generateID(),
            fraud_score: fraud_score,
            risk_label: risk_label,
            anomalies_detected: anomalies.length,
            anomalies: anomalies,
            note: `Risk assessment is ${risk_label} - recommend manual review if score > 60`,
            timestamp: new Date().toISOString()
        };

        // Log to Motherboard
        this.logToMotherboard('fraud', fraud_assessment);

        return fraud_assessment;
    }

    /**
     * Check if an indicator is present
     * @param {Object} data - Data to check
     * @param {string} indicator - Indicator to check
     * @returns {boolean} Indicator present
     */
    checkIndicator(data, indicator) {
        // Simplified indicator checking
        if (indicator.includes('Age') && data.age >= 80) return true;
        if (indicator.includes('smoker') && data.smoker_status === 'Yes') return true;
        if (indicator.includes('health') && data.health_conditions === 'Yes') return true;
        if (indicator.includes('maximum') && data.coverage_amount === '$25,000') return true;
        return false;
    }
}

/**
 * Compliance Bot - Checks content for compliance violations
 */
class ComplianceBot extends BotFramework {
    constructor() {
        super('Compliance Bot');
    }

    /**
     * Check content for compliance
     * @param {string} content - Content to check
     * @returns {Object} Compliance assessment
     */
    checkContent(content) {
        // Verify action is allowed
        if (!this.verifyAction('check_content')) {
            return { error: 'Action not authorized' };
        }

        const compliance_check = this.motherboard.checkCompliance(content);

        const assessment = {
            assessment_id: this.generateID(),
            compliance_status: compliance_check.compliance_status,
            violations_count: compliance_check.violations_count,
            violations: compliance_check.violations,
            corrections_needed: compliance_check.violations_count > 0,
            note: `Status is ${compliance_check.compliance_status} - ${compliance_check.violations_count} issues found`,
            timestamp: new Date().toISOString()
        };

        // Log to Motherboard
        this.logToMotherboard('compliance', assessment);

        return assessment;
    }
}

/**
 * Customer Service Bot - Answers customer questions
 */
class CustomerServiceBot extends BotFramework {
    constructor() {
        super('Customer Service Bot');
    }

    /**
     * Answer customer question
     * @param {string} question - Customer question
     * @returns {Object} Response with answer
     */
    answerQuestion(question) {
        // Verify action is allowed
        if (!this.verifyAction('answer_questions')) {
            return { error: 'Action not authorized' };
        }

        const product_def = this.getRules('product');
        let answer = this.findAnswer(question, product_def);

        const response = {
            response_id: this.generateID(),
            question_text: question,
            answer_text: answer,
            references_product_definition: true,
            follow_up_actions: this.suggestFollowUp(question),
            timestamp: new Date().toISOString()
        };

        // Log to Motherboard
        this.logToMotherboard('support', response);

        return response;
    }

    /**
     * Find answer to question
     * @param {string} question - Question to answer
     * @param {Object} product_def - Product definitions
     * @returns {string} Answer
     */
    findAnswer(question, product_def) {
        const q_lower = question.toLowerCase();

        if (q_lower.includes('coverage') || q_lower.includes('how much')) {
            return `Final Expense Life Insurance offers coverage from $5,000 to $25,000. You can choose the amount that best fits your family's needs.`;
        } else if (q_lower.includes('age') || q_lower.includes('eligibility')) {
            return `This product is available for ages 40 to 85 years old. Simply fill out our quick application to get started.`;
        } else if (q_lower.includes('medical') || q_lower.includes('exam')) {
            return `No medical exam is required! Our simple application just asks a few straightforward health questions. No doctor visits, no blood tests, no hassle.`;
        } else if (q_lower.includes('claim') || q_lower.includes('file')) {
            return `To file a claim, contact us with the policy number and we'll walk you through the process. We'll collect the necessary documentation and process your claim quickly.`;
        } else if (q_lower.includes('premium') || q_lower.includes('cost') || q_lower.includes('price')) {
            return `Premium amounts depend on your age, coverage amount, and health information. Get a personalized quote to see your specific rate.`;
        } else if (q_lower.includes('approval') || q_lower.includes('how fast')) {
            return `Our streamlined process means fast approval. Most applications are reviewed within days. We'll send you updates throughout the process.`;
        } else {
            return `Thank you for your question. For more information about Final Expense Life Insurance, please visit our product page or contact our customer service team.`;
        }
    }

    /**
     * Suggest follow-up actions
     * @param {string} question - Original question
     * @returns {Array} Suggested actions
     */
    suggestFollowUp(question) {
        const q_lower = question.toLowerCase();
        const actions = [];

        if (q_lower.includes('quote') || q_lower.includes('apply')) {
            actions.push('Offer link to quote form');
        }
        if (q_lower.includes('claim')) {
            actions.push('Direct to claims process');
        }
        if (q_lower.includes('more information')) {
            actions.push('Offer product page link');
        }

        return actions.length > 0 ? actions : ['Offer general support'];
    }
}

// Export for use in Browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BotFramework,
        AgentBot,
        UnderwritingBot,
        ClaimsBot,
        FraudBot,
        ComplianceBot,
        CustomerServiceBot
    };
}
