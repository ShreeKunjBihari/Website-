
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const pool = require("../db/db");

const dataDirectory = path.resolve(__dirname, "../../data");
const letters = "abcdefghijklmnopqrstuvwxyz".split("");

const products = [];
const warnings = [];

for (const letter of letters) {
  const filePath = path.join(dataDirectory, `${letter}.js`);

  if (!fs.existsSync(filePath)) {
    warnings.push(`Missing file: ${letter}.js`);
    continue;
  }

  const source = fs.readFileSync(filePath, "utf8");
  const variableName = `products${letter.toUpperCase()}`;

  // Evaluate the file and explicitly expose its declared array.
  const sandbox = {};
  const wrappedSource = `
    ${source}
    globalThis.__products = ${variableName};
  `;

  vm.runInNewContext(wrappedSource, sandbox, {
    filename: filePath,
    timeout: 10000
  });

  const letterProducts = sandbox.__products;

  if (!Array.isArray(letterProducts)) {
    throw new Error(
      `Expected an array named ${variableName} in ${letter}.js`
    );
  }

  console.log(`${letter}.js: ${letterProducts.length} products`);
  products.push(...letterProducts);
}

const seenSlugs = new Set();
let validProducts = 0;
let validCompounds = 0;
let skippedCompounds = 0;

for (const product of products) {
  if (!product.name || !product.slug) {
    warnings.push(
  `Product missing name or slug: ${JSON.stringify(product)}`
   );
    continue;
  }

  if (seenSlugs.has(product.slug)) {
    warnings.push(
   `Duplicate product slug: ${product.slug} | Product name: ${product.name}`
     );
    continue;
  }

  seenSlugs.add(product.slug);
  validProducts++;

  const impurities = Array.isArray(product.impurities)
    ? product.impurities
    : [];

  for (const impurity of impurities) {
  if (!impurity || typeof impurity !== "object") {
    skippedCompounds++;
    continue;
  }

  const name = String(impurity.name || "").trim();
  const cas = String(impurity.cas || "").trim();
  const formula = String(impurity.formula || "").trim();
  const image = String(impurity.image || "").trim();

  // Keep records that contain useful identifying information.
  if (!name && !cas && !formula && !image) {
    skippedCompounds++;
    continue;
  }

  validCompounds++;
}
}

console.log("\n=== Product Import Preview ===");
console.log(`Products read: ${products.length}`);
console.log(`Products passing validation: ${validProducts}`);
console.log(`Usable impurity entries: ${validCompounds}`);
console.log(`Impurity entries skipped: ${skippedCompounds}`);
console.log(`Warnings: ${warnings.length}`);

for (const warning of warnings) {
  console.log("WARNING:", warning);
}

console.log("\nPreview only. No database records were changed.");



// ========================================
// DATABASE IMPORT
// ========================================

// Database insertion logic will go here.

async function importProducts() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("Database connection successful.");
    console.log("Starting product import...");

    // Product and compound insertion logic comes next.

    await client.query("ROLLBACK");
    console.log("Test completed. No database records were changed.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Import test failed:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}