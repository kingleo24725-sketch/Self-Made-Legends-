const InAppMarketplaceManager = require("./InAppMarketplaceManager");

console.log("=".repeat(80));
console.log("IN-APP MARKETPLACE MANAGER - TESTS");
console.log("=".repeat(80));

const marketplace = new InAppMarketplaceManager();

// =============================================================================
// TEST 1: View All Available Products
// =============================================================================
console.log("\n📍 TEST 1: Available Marketplace Products");
console.log("-".repeat(80));

const allProducts = marketplace.getAllProducts();
console.log(`\nAvailable Products by Category:\n`);

const categories = {};
allProducts.forEach(product => {
  if (!categories[product.category]) {
    categories[product.category] = [];
  }
  categories[product.category].push(product);
});

Object.entries(categories).forEach(([category, products]) => {
  console.log(`${category}:`);
  products.forEach(product => {
    console.log(`  • ${product.name}`);
    console.log(`    Price: $${product.price.toFixed(2)} | Monthly Sales: ${product.monthlySales}`);
    console.log(`    Description: ${product.description}\n`);
  });
});

// =============================================================================
// TEST 2: Purchase a Product
// =============================================================================
console.log("\n📍 TEST 2: Purchase Product");
console.log("-".repeat(80));

const purchase1 = marketplace.purchaseProduct('rider_001', 'profile_badges', 1);

console.log(`\nProduct Purchase:\n`);
console.log(`  Success: ${purchase1.success ? '✓ YES' : '✗ NO'}`);
console.log(`  Purchase ID: ${purchase1.purchaseId}`);
console.log(`  Product: ${purchase1.productName}`);
console.log(`  Quantity: ${purchase1.quantity}`);
console.log(`  Unit Price: $${purchase1.unitPrice}`);
console.log(`  Total: $${purchase1.totalAmount}`);
console.log(`  Message: ${purchase1.message}`);

// =============================================================================
// TEST 3: Monthly Marketplace Revenue
// =============================================================================
console.log("\n\n📍 TEST 3: Monthly Marketplace Revenue Calculation");
console.log("-".repeat(80));

const monthlyRevenue = marketplace.calculateMonthlyRevenue();

console.log(`\nProduct Revenue Breakdown (487 active users):\n`);
console.log("Product                        Price | Sales | Monthly Revenue");
console.log("-".repeat(68));

Object.values(monthlyRevenue.productRevenues).forEach(product => {
  console.log(
    product.name.padEnd(30) + " | " +
    `$${product.price}`.padStart(5) + " | " +
    product.monthlySales.toString().padStart(5) + " | " +
    `$${product.monthlyRevenue}`.padStart(15)
  );
});

console.log(`\nTotal Marketplace Revenue:`);
console.log(`  Monthly: $${monthlyRevenue.totalMonthlyRevenue}`);
console.log(`  Annual: $${monthlyRevenue.annualRevenue}`);
console.log(`  Revenue per Active User: $${monthlyRevenue.revenuePerActiveUser}`);

// =============================================================================
// TEST 4: Multiple Purchases
// =============================================================================
console.log("\n\n📍 TEST 4: Multiple Product Purchases");
console.log("-".repeat(80));

console.log(`\nRider purchases multiple items:\n`);

const purchase2 = marketplace.purchaseProduct('rider_001', 'ride_boosts', 1);
console.log(`  • ${purchase2.productName}: $${purchase2.totalAmount}`);

const purchase3 = marketplace.purchaseProduct('rider_001', 'premium_emotes', 2);
console.log(`  • ${purchase3.productName}: $${purchase3.totalAmount} (×${purchase3.quantity})`);

const purchase4 = marketplace.purchaseProduct('rider_001', 'vehicle_skins', 1);
console.log(`  • ${purchase4.productName}: $${purchase4.totalAmount}`);

const totalSpent = parseFloat(purchase2.totalAmount) + parseFloat(purchase3.totalAmount) + parseFloat(purchase4.totalAmount);
console.log(`\n  Total Spent by Rider: $${totalSpent.toFixed(2)}`);

// =============================================================================
// TEST 5: Category Revenue Analysis
// =============================================================================
console.log("\n\n📍 TEST 5: Revenue by Product Category");
console.log("-".repeat(80));

const categoryRevenue = marketplace.getCategoryRevenue();

console.log(`\nMonthly Revenue by Category:\n`);
Object.entries(categoryRevenue).forEach(([category, revenue]) => {
  const percentage = (revenue / parseFloat(monthlyRevenue.totalMonthlyRevenue)) * 100;
  console.log(`  ${category.padEnd(30)}: $${revenue.toFixed(2).padStart(8)} (${percentage.toFixed(1)}%)`);
});

// =============================================================================
// TEST 6: Featured Products
// =============================================================================
console.log("\n\n📍 TEST 6: Top Selling Products");
console.log("-".repeat(80));

const featured = marketplace.getFeaturedProducts(3);

console.log(`\nTop 3 Products by Monthly Sales:\n`);
featured.forEach((product, idx) => {
  const revenue = product.price * product.monthlySales;
  console.log(`${idx + 1}. ${product.name}`);
  console.log(`   Sales: ${product.monthlySales}/month`);
  console.log(`   Revenue: $${revenue.toFixed(2)}/month`);
  console.log("");
});

// =============================================================================
// TEST 7: Marketplace Statistics
// =============================================================================
console.log("\n📍 TEST 7: Marketplace Statistics");
console.log("-".repeat(80));

// Simulate 300 purchases
for (let i = 0; i < 300; i++) {
  const productKeys = Object.keys(marketplace.products);
  const randomProduct = productKeys[Math.floor(Math.random() * productKeys.length)];
  const randomUser = `rider_${Math.floor(Math.random() * 100)}`;

  marketplace.purchaseProduct(randomUser, marketplace.products[randomProduct].id);
}

const stats = marketplace.getMarketplaceStats();

console.log(`\nMarketplace Statistics (300 simulated purchases):\n`);
console.log(`  Total Purchases: ${stats.totalPurchases}`);
console.log(`  Total Revenue: $${stats.totalRevenue}`);
console.log(`  Unique Buyers: ${stats.uniqueBuyers}`);
console.log(`  Average Purchase Value: $${stats.averagePurchaseValue}`);
console.log(`  Conversion Rate: ${stats.conversionRate}% of active users`);
if (stats.topProduct) {
  console.log(`  Top Product: ${stats.topProduct.name} (${stats.topProduct.quantity} units)`);
}

// =============================================================================
// TEST 8: Promotional Discounts
// =============================================================================
console.log("\n\n📍 TEST 8: Apply Promotional Discount");
console.log("-".repeat(80));

const promo = marketplace.applyPromotion('premium_emotes', 25, 'weekly');

console.log(`\nPromotion Details:\n`);
console.log(`  Product: ${promo.productName}`);
console.log(`  Original Price: $${promo.originalPrice}`);
console.log(`  Discount: ${promo.discountPercent}% (-$${promo.discountAmount})`);
console.log(`  Promoted Price: $${promo.promotedPrice}`);
console.log(`  Duration: ${promo.duration}`);
console.log(`  Expected Sales Lift: ${promo.estimatedSalesLift}`);

// =============================================================================
// TEST 9: User Purchase History
// =============================================================================
console.log("\n\n📍 TEST 9: User Purchase History");
console.log("-".repeat(80));

const userPurchases = marketplace.getUserPurchases('rider_001');

console.log(`\nRider 001 Purchase History (${userPurchases.length} purchases):\n`);
userPurchases.forEach((purchase, idx) => {
  console.log(`${idx + 1}. ${purchase.productName}`);
  console.log(`   Price: $${purchase.price.toFixed(2)} × ${purchase.quantity}`);
  console.log(`   Total: $${purchase.totalAmount.toFixed(2)}`);
});

// =============================================================================
// TEST 10: Pure Profit Concept
// =============================================================================
console.log("\n\n📍 TEST 10: Pure Profit - Digital Marketplace");
console.log("-".repeat(80));

console.log(`\nMarketplace is PURE PROFIT because:\n`);
console.log(`  ✓ Digital goods (no manufacturing cost)`);
console.log(`  ✓ Mogo receives 100% of sales price`);
console.log(`  ✓ Driver receives: $0 (unaffected)`);
console.log(`  ✓ No delivery or fulfillment needed`);
console.log(`  ✓ Infinite inventory (digital duplication)`);
console.log(`  ✓ Enhances user engagement`);
console.log(`  ✓ Margin: 100%`);

console.log(`\n  Scaling to monthly: $${monthlyRevenue.totalMonthlyRevenue}/month pure profit`);
console.log(`  Scaling to annual: $${monthlyRevenue.annualRevenue}/year pure profit`);

// =============================================================================
console.log("\n" + "=".repeat(80));
console.log("IN-APP MARKETPLACE TESTS COMPLETED ✓");
console.log("=".repeat(80));
