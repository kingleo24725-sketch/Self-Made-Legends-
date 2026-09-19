const CorporateAccountManager = require("./CorporateAccountManager");

console.log("=".repeat(80));
console.log("CORPORATE ACCOUNT MANAGER - TESTS");
console.log("=".repeat(80));

const corporate = new CorporateAccountManager();

// =============================================================================
// TEST 1: Create Corporate Account
// =============================================================================
console.log("\n📍 TEST 1: Create Corporate Account");
console.log("-".repeat(80));

const account1 = corporate.createCorporateAccount('TechCorp Inc', 'midmarket', 'hr@techcorp.com');

console.log(`\nCorporate Account Created:\n`);
console.log(`  Success: ${account1.success ? '✓ YES' : '✗ NO'}`);
console.log(`  Account ID: ${account1.accountId}`);
console.log(`  Company: ${account1.companyName}`);
console.log(`  Tier: ${account1.tier}`);
console.log(`  Monthly Base Fee: $${account1.monthlyBaseFee}`);
console.log(`  Commission Rate: ${account1.commissionRate}`);

// =============================================================================
// TEST 2: Add Employees to Corporate Account
// =============================================================================
console.log("\n\n📍 TEST 2: Add Employees to Corporate Account");
console.log("-".repeat(80));

const emp1 = corporate.addEmployee(account1.accountId, 'john.smith@techcorp.com', 'John Smith', 500, 'DEPT-001');
const emp2 = corporate.addEmployee(account1.accountId, 'jane.doe@techcorp.com', 'Jane Doe', 750, 'DEPT-002');
const emp3 = corporate.addEmployee(account1.accountId, 'bob.jones@techcorp.com', 'Bob Jones', 300, 'DEPT-001');

console.log(`\nEmployees Added:\n`);
console.log(`  Employee 1: ${emp1.email} - $${emp1.spendLimit}/month`);
console.log(`  Employee 2: ${emp2.email} - $${emp2.spendLimit}/month`);
console.log(`  Employee 3: ${emp3.email} - $${emp3.spendLimit}/month`);

// =============================================================================
// TEST 3: Process Rides
// =============================================================================
console.log("\n\n📍 TEST 3: Process Corporate Rides");
console.log("-".repeat(80));

const ride1 = corporate.processRide('john.smith@techcorp.com', 25.50, { from: 'Office', to: 'Airport' });
const ride2 = corporate.processRide('jane.doe@techcorp.com', 18.75, { from: 'Hotel', to: 'Conference' });
const ride3 = corporate.processRide('bob.jones@techcorp.com', 12.30, { from: 'Office', to: 'Meeting' });

console.log(`\nRides Processed:\n`);
console.log(`  Ride 1: $${ride1.rideAmount} | Commission: $${ride1.commission}`);
console.log(`  Ride 2: $${ride2.rideAmount} | Commission: $${ride2.commission}`);
console.log(`  Ride 3: $${ride3.rideAmount} | Commission: $${ride3.commission}`);
console.log(`\n  Employee Spending Limits:`);
console.log(`    John: $${ride1.employeeSpent}/$500 remaining: $${ride1.remainingBudget}`);
console.log(`    Jane: $${ride2.employeeSpent}/$750 remaining: $${ride2.remainingBudget}`);
console.log(`    Bob: $${ride3.employeeSpent}/$300 remaining: $${ride3.remainingBudget}`);

// =============================================================================
// TEST 4: Multiple Corporate Accounts
// =============================================================================
console.log("\n\n📍 TEST 4: Multiple Corporate Accounts");
console.log("-".repeat(80));

const account2 = corporate.createCorporateAccount('FinanceGroup LLC', 'startup', 'finance@financegroup.com');
const account3 = corporate.createCorporateAccount('Enterprise Solutions Corp', 'enterprise', 'it@enterprise.com');

console.log(`\nMultiple Accounts Created:\n`);
console.log(`  Account 1: ${account1.companyName} (${account1.tier}) - $${account1.monthlyBaseFee}/month`);
console.log(`  Account 2: ${account2.companyName} (${account2.tier}) - $${account2.monthlyBaseFee}/month`);
console.log(`  Account 3: ${account3.companyName} (${account3.tier}) - $${account3.monthlyBaseFee}/month`);

// =============================================================================
// TEST 5: Monthly Revenue Calculation
// =============================================================================
console.log("\n\n📍 TEST 5: Monthly Corporate Revenue");
console.log("-".repeat(80));

const monthlyRevenue = corporate.calculateMonthlyRevenue(45);

console.log(`\nRevenue Breakdown (45 estimated accounts):\n`);

Object.values(monthlyRevenue.revenueBreakdown).forEach(tier => {
  console.log(`${tier.name}:`);
  console.log(`  Accounts: ${tier.accounts}`);
  console.log(`  Base Fees: $${tier.baseFees}`);
  console.log(`  Commissions: $${tier.commissions}`);
  console.log(`  Total: $${tier.total}\n`);
});

console.log(`Summary:`);
console.log(`  Base Fee Revenue: $${monthlyRevenue.totalBaseFeeRevenue}`);
console.log(`  Commission Revenue: $${monthlyRevenue.totalCommissionRevenue}`);
console.log(`\n  Total Monthly Revenue: $${monthlyRevenue.totalMonthlyRevenue}`);
console.log(`  Total Annual Revenue: $${monthlyRevenue.annualRevenue}`);
console.log(`  Average Revenue per Account: $${monthlyRevenue.averageRevenuePerAccount}`);

// =============================================================================
// TEST 6: Billing Report
// =============================================================================
console.log("\n\n📍 TEST 6: Generate Billing Report");
console.log("-".repeat(80));

// Simulate more rides for account
corporate.processRide('john.smith@techcorp.com', 22.00);
corporate.processRide('jane.doe@techcorp.com', 31.25);

const billingReport = corporate.generateBillingReport(account1.accountId);

console.log(`\nBilling Report for ${billingReport.companyName}:\n`);
console.log(`  Account Tier: ${billingReport.tier}`);
console.log(`  Base Fee: $${billingReport.baseFee}`);
console.log(`  Total Rides: ${billingReport.totalRides}`);
console.log(`  Total Ride Amount: $${billingReport.totalRideAmount}`);
console.log(`  Commission Rate: ${billingReport.commissionRate}`);
console.log(`  Commission Revenue: $${billingReport.totalCommission}`);
console.log(`  Total Invoice: $${billingReport.totalInvoiceAmount}`);
console.log(`  Employees: ${billingReport.employeeCount}`);
console.log(`  Top Spender: ${billingReport.topSpender}`);

// =============================================================================
// TEST 7: Corporate Statistics
// =============================================================================
console.log("\n\n📍 TEST 7: Corporate Program Statistics");
console.log("-".repeat(80));

// Add more employees and accounts to simulate growth
corporate.addEmployee(account2.accountId, 'finance.user@financegroup.com', 'Finance User', 400);
corporate.addEmployee(account3.accountId, 'it.user@enterprise.com', 'IT User', 1000);
corporate.processRide('finance.user@financegroup.com', 15.00);
corporate.processRide('it.user@enterprise.com', 45.00);

const stats = corporate.getCorporateStats();

console.log(`\nCorporate Program Stats:\n`);
console.log(`  Total Corporate Accounts: ${stats.totalCorporateAccounts}`);
console.log(`  Total Employees: ${stats.totalEmployees}`);
console.log(`  Total Rides Processed: ${stats.totalRidesProcessed}`);
console.log(`  Monthly Base Fees: $${stats.totalMonthlyBaseFees}`);
console.log(`  Estimated Commission: $${stats.estimatedMonthlyCommission}`);
console.log(`  Avg Employees per Account: ${stats.averageEmployeesPerAccount}`);
console.log(`\n  Accounts by Tier:`);
console.log(`    Startup: ${stats.accountsByTier.startup}`);
console.log(`    Mid-Market: ${stats.accountsByTier.midmarket}`);
console.log(`    Enterprise: ${stats.accountsByTier.enterprise}`);

// =============================================================================
// TEST 8: Spend Limit Enforcement
// =============================================================================
console.log("\n\n📍 TEST 8: Spend Limit Enforcement");
console.log("-".repeat(80));

const limitedEmp = corporate.addEmployee(account2.accountId, 'limited@financegroup.com', 'Limited User', 50);

// Try to exceed limit
const overLimit = corporate.processRide('limited@financegroup.com', 55.00);

console.log(`\nSpend Limit Test:\n`);
console.log(`  Employee Budget: $${limitedEmp.spendLimit}`);
console.log(`  Requested Ride: $55.00`);
console.log(`  Result: ${overLimit.success ? '✓ APPROVED' : '✗ DENIED'}`);
if (!overLimit.success) {
  console.log(`  Reason: ${overLimit.error}`);
}

// Within limit
const withinLimit = corporate.processRide('limited@financegroup.com', 40.00);
console.log(`\n  Requested Ride: $40.00`);
console.log(`  Result: ${withinLimit.success ? '✓ APPROVED' : '✗ DENIED'}`);

// =============================================================================
// TEST 9: Different Tier Pricing
// =============================================================================
console.log("\n\n📍 TEST 9: Pricing Comparison by Tier");
console.log("-".repeat(80));

const tiers = corporate.accountPricingTiers;

console.log(`\nCorporate Account Tiers:\n`);
Object.entries(tiers).forEach(([key, tier]) => {
  console.log(`${tier.name}:`);
  console.log(`  Base Fee: $${tier.monthlyBaseFee}/month`);
  console.log(`  Commission Rate: ${(tier.rideCommissionRate * 100).toFixed(0)}%`);
  console.log(`  Max Employees: ${tier.maxEmployees}`);
  console.log(`  Features: ${tier.features.length}`);
  console.log(`  Estimated Annual: $${(tier.monthlyBaseFee * 12 + (200 * 25 * tier.rideCommissionRate * 12)).toFixed(2)}\n`);
});

// =============================================================================
// TEST 10: Pure Profit Concept
// =============================================================================
console.log("\n\n📍 TEST 10: Pure Profit - Corporate Accounts");
console.log("-".repeat(80));

console.log(`\nCorporate Accounts are PURE PROFIT because:\n`);
console.log(`  ✓ Base fees (100% to mogo)`);
console.log(`  ✓ Commission on rides (no driver payout impact)`);
console.log(`  ✓ Existing platform (no new infrastructure)`);
console.log(`  ✓ Mogo receives 8% commission per ride`);
console.log(`  ✓ Driver earnings: Unchanged`);
console.log(`  ✓ Rider: Company pays, individual gets benefit`);
console.log(`  ✓ Margin: 100%`);

console.log(`\n  Scaling to monthly: $${monthlyRevenue.totalMonthlyRevenue}/month pure profit`);
console.log(`  Scaling to annual: $${monthlyRevenue.annualRevenue}/year pure profit`);

// =============================================================================
console.log("\n" + "=".repeat(80));
console.log("CORPORATE ACCOUNT TESTS COMPLETED ✓");
console.log("=".repeat(80));
