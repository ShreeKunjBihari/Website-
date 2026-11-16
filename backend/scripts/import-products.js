
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const pool = require("../db/db");

const DATA_DIR = path.resolve(__dirname, "../../data");
const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

function loadProducts() {
  const products = [];
  const warnings = [];
  const seenSlugs = new Set();

  for (const letter of LETTERS) {
    const filePath = path.join(DATA_DIR, `${letter}.js`);

    if (!fs.existsSync(filePath)) {
      warnings.push(`Missing file: ${letter}.js`);
      continue;
    }

    const source = fs.readFileSync(filePath, "utf8");
    const variableName = `products${letter.toUpperCase()}`;
    const sandbox = {};

    vm.runInNewContext(
      `${source}\nglobalThis.__products = ${variableName};`,
      sandbox,
      { filename: filePath, timeout: 10000 }
    );

    if (!Array.isArray(sandbox.__products)) {
      throw new Error(`Invalid product array in ${letter}.js`);
    }

    for (const product of sandbox.__products) {
      const name =
        typeof product?.name === "string" ? product.name.trim() : "";
      const slug =
        typeof product?.slug === "string" ? product.slug.trim() : "";

      if (!name || !slug) {
        warnings.push(`Skipped product with missing name or slug in ${letter}.js`);
        continue;
      }

      if (seenSlugs.has(slug)) {
        warnings.push(`Duplicate product slug skipped: ${slug}`);
        continue;
      }

      seenSlugs.add(slug);
      products.push({ ...product, name, slug });
    }
  }

  return { products, warnings };
}

function normalizeImpurity(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return null;
  }

  const text = (value) =>
    value == null ? "" : String(value).trim();

  const name = text(item.name);
  const cas = text(item.cas);
  const formula = text(item.formula);
  const image = text(item.image);

  if (!name && !cas && !formula && !image) {
    return null;
  }

  return {
    name,
    cas: cas || null,
    formula: formula || null,
    image: image || null
  };
}

function prepareProducts(products) {
  let usableEntries = 0;
  let skippedEntries = 0;
  let unnamedEntries = 0;

  const prepared = products.map((product) => {
    const source = Array.isArray(product.impurities)
      ? product.impurities
      : [];

    const impurities = [];

    source.forEach((item, index) => {
      const impurity = normalizeImpurity(item);

      if (!impurity) {
        skippedEntries++;
        return;
      }

      if (!impurity.name) unnamedEntries++;

      impurities.push({
        ...impurity,
        displayOrder: index
      });

      usableEntries++;
    });

    return { product, impurities };
  });

  return {
    prepared,
    usableEntries,
    skippedEntries,
    unnamedEntries
  };
}

async function importProducts() {
  const { products, warnings } = loadProducts();
  const stats = prepareProducts(products);

  console.log("\n=== Import Preview ===");
  console.log(`Products prepared: ${products.length}`);
  console.log(`Usable impurity entries: ${stats.usableEntries}`);
  console.log(`Entries without names: ${stats.unnamedEntries}`);
  console.log(`Entries skipped: ${stats.skippedEntries}`);
  console.log(`Warnings: ${warnings.length}`);

  warnings.forEach((warning) => console.log("WARNING:", warning));

  // Actual insertion requires an explicit confirmation.
  if (process.env.IMPORT_CONFIRM !== "YES") {
    console.log("\nDRY RUN: no database records were changed.");
    console.log("Review these counts before enabling the import.");
    return;
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    // This importer expects a fresh, empty product database.
    const countResult = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM products) AS products,
        (SELECT COUNT(*) FROM compounds) AS compounds,
        (SELECT COUNT(*) FROM product_compounds) AS links
    `);

    const counts = countResult.rows[0];

    if (
      Number(counts.products) !== 0 ||
      Number(counts.compounds) !== 0 ||
      Number(counts.links) !== 0
    ) {
      throw new Error(
        "Import stopped: products, compounds, and links must all be empty."
      );
    }

    let productCount = 0;
    let compoundCount = 0;
    let linkCount = 0;

    for (const { product, impurities } of stats.prepared) {
      const result = await client.query(
        `INSERT INTO products
          (name, slug, description, category, image_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          product.name,
          product.slug,
          product.description || null,
          product.category || null,
          product.image || null
        ]
      );

      const productId = result.rows[0].id;
      productCount++;

      for (const impurity of impurities) {
        // The schema requires a name. Use an explicitly marked
        // placeholder when the source has no name; never infer identity.
        const compoundName = impurity.name ||
          `[Unnamed source entry: ${product.slug} #${impurity.displayOrder + 1}]`;

        const compoundResult = await client.query(
          `INSERT INTO compounds
            (name, cas_number, molecular_formula, description, image_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            compoundName,
            impurity.cas,
            impurity.formula,
            null,
            impurity.image
          ]
        );

        const compoundId = compoundResult.rows[0].id;
        compoundCount++;

        await client.query(
          `INSERT INTO product_compounds
            (product_id, compound_id, display_order)
           VALUES ($1, $2, $3)`,
          [productId, compoundId, impurity.displayOrder]
        );

        linkCount++;
      }
    }

    await client.query("COMMIT");
    transactionStarted = false;

    console.log("\nIMPORT COMPLETED");
    console.log(`Products inserted: ${productCount}`);
    console.log(`Compound records inserted: ${compoundCount}`);
    console.log(`Product-compound links created: ${linkCount}`);
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError.message);
      }
    }

    console.error("Import failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

importProducts().catch(async (error) => {
  console.error("Importer stopped:", error.message);
  await pool.end();
  process.exitCode = 1;
});
