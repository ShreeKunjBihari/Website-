"use strict";

require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pool = require("./db/db");

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

// The public address of the website, e.g. https://skunj.com (no trailing slash).
// Used for sitemap.xml / robots.txt and for the www -> non-www redirect.
const SITE_URL = (process.env.SITE_URL || "").replace(/\/+$/, "");

// When the site runs behind a reverse proxy / hosting platform (Render, Railway,
// Nginx, Cloudflare...) the real visitor IP arrives in X-Forwarded-For. Without
// this, the rate limiter would see EVERY visitor as the proxy's single IP and
// lock the whole site out after 15 form submissions.
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS || 1));

// Hide the "X-Powered-By: Express" header
app.disable("x-powered-by");

// In production: force HTTPS, and send www.<domain> to <domain> (one canonical
// address is important for search engines).
if (isProduction) {
  app.use((req, res, next) => {
    if (req.path === "/api/health") return next();

    const host = req.hostname;
    if (SITE_URL) {
      const canonicalHost = new URL(SITE_URL).hostname;
      if (host !== canonicalHost && host === `www.${canonicalHost}`) {
        return res.redirect(301, `${SITE_URL}${req.originalUrl}`);
      }
    }
    if (req.protocol !== "https") {
      return res.redirect(301, `https://${req.get("host")}${req.originalUrl}`);
    }
    next();
  });
}

// ------------------------------------
// SECURITY MIDDLEWARE
// ------------------------------------

// Security headers (XSS, clickjacking, MIME sniffing, HSTS, etc.)
app.use(helmet({
  contentSecurityPolicy: false,       // Allow inline scripts on frontend
  crossOriginEmbedderPolicy: false    // Allow loading images cross-origin
}));

// CORS — restrict to your actual domain in production
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : ["http://localhost:5500", "http://localhost:5501", "http://127.0.0.1:5500", "http://localhost:3000"];

app.use(cors({
  origin: isProduction
    ? ALLOWED_ORIGINS
    : true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

// Body parser with size limit (enquiry payloads are small)
app.use(express.json({ limit: "10kb" }));

// Rate limiting on form submission endpoints
const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 15,                     // 15 submissions per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many submissions. Please try again later."
  }
});

// Rate limiting on general API access
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 minute
  max: 120,                    // 120 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api", apiLimiter);

// ------------------------------------
// SEARCH-ENGINE FILES
// ------------------------------------

app.get("/robots.txt", (req, res) => {
  const lines = ["User-agent: *", "Allow: /", "Disallow: /api/"];
  if (SITE_URL) lines.push("", `Sitemap: ${SITE_URL}/sitemap.xml`);
  res.type("text/plain").send(lines.join("\n") + "\n");
});

// sitemap.xml is generated from the database, so every product page is listed
// automatically and stays current when products are added.
app.get("/sitemap.xml", async (req, res) => {
  const base = SITE_URL || `${req.protocol}://${req.get("host")}`;
  const esc = v => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const staticPages = ["", "about.html", "product.html", "quality.html", "contact.html"];

  try {
    const result = await pool.query(
      "SELECT slug FROM products WHERE is_active = TRUE ORDER BY name ASC"
    );
    const urls = [
      ...staticPages.map(p => `${base}/${p}`),
      ...result.rows.map(r => `${base}/product-detail.html?product=${encodeURIComponent(r.slug)}`)
    ];
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map(u => `  <url><loc>${esc(u)}</loc></url>`).join("\n") +
      "\n</urlset>\n";
    res.type("application/xml").send(xml);
  } catch (error) {
    console.error("Sitemap generation failed:", error.message);
    res.status(500).type("text/plain").send("Sitemap unavailable.");
  }
});

// ------------------------------------
// HEALTH CHECK
// ------------------------------------

app.get("/api/health", (req, res) => {
  res.json({ success: true, status: "healthy" });
});

// NOTE: /api/db-test has been REMOVED for production security.
// Use /api/health to verify the server is running.

// ------------------------------------
// PRODUCT CATALOG ENDPOINTS
// ------------------------------------

// Get all active products with their impurities
app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id, p.name, p.slug, p.description, p.category, p.image_url,
        COALESCE(
          json_agg(
            json_build_object(
              'name', CASE WHEN c.name LIKE '[Unnamed source entry:%' THEN NULL ELSE c.name END,
              'cas', c.cas_number,
              'formula', c.molecular_formula,
              'image', c.image_url
            )
            ORDER BY pc.display_order, c.name
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'::json
        ) AS impurities
      FROM products p
      LEFT JOIN product_compounds pc ON pc.product_id = p.id
      LEFT JOIN compounds c ON c.id = pc.compound_id
      WHERE p.is_active = TRUE
      GROUP BY p.id
      ORDER BY p.name ASC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      products: result.rows
    });
  } catch (error) {
    console.error("Failed to fetch products:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve products."
    });
  }
});

// Get a single product by slug
app.get("/api/products/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    // Validate slug format
    if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug) || slug.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Invalid product identifier."
      });
    }

    const result = await pool.query(`
      SELECT
        p.id, p.name, p.slug, p.description, p.category, p.image_url,
        COALESCE(
          json_agg(
            json_build_object(
              'name', CASE WHEN c.name LIKE '[Unnamed source entry:%' THEN NULL ELSE c.name END,
              'cas', c.cas_number,
              'formula', c.molecular_formula,
              'image', c.image_url
            )
            ORDER BY pc.display_order, c.name
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'::json
        ) AS impurities
      FROM products p
      LEFT JOIN product_compounds pc ON pc.product_id = p.id
      LEFT JOIN compounds c ON c.id = pc.compound_id
      WHERE p.slug = $1 AND p.is_active = TRUE
      GROUP BY p.id
    `, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found."
      });
    }

    res.json({
      success: true,
      product: result.rows[0]
    });
  } catch (error) {
    console.error("Failed to fetch product by slug:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve product details."
    });
  }
});

// ------------------------------------
// ENQUIRY & QUOTE ENDPOINTS
// ------------------------------------

const clean = (value, maxLength) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Save a general enquiry
app.post("/api/enquiries", enquiryLimiter, async (req, res) => {
  const {
    customer_name, company_name, email, phone,
    enquiry_type, product_name, cas_number, quantity, requirements
  } = req.body || {};

  if (
    typeof customer_name !== "string" || !customer_name.trim() ||
    typeof email !== "string" || !email.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Name and email are required."
    });
  }

  const cleanName = customer_name.trim();
  const cleanEmail = email.trim();

  if (cleanName.length > 200 || cleanEmail.length > 254) {
    return res.status(400).json({
      success: false,
      message: "Name or email exceeds the allowed length."
    });
  }

  if (!EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address."
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO enquiries
        (customer_name, company_name, email, phone, enquiry_type,
         product_name, cas_number, quantity, requirements)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, created_at`,
      [
        cleanName,
        clean(company_name, 250),
        cleanEmail,
        clean(phone, 50),
        clean(enquiry_type, 100),
        clean(product_name, 300),
        clean(cas_number, 50),
        clean(quantity, 100),
        clean(requirements, 10000)
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Your enquiry has been submitted successfully.",
      enquiry: result.rows[0]
    });
  } catch (error) {
    console.error("Enquiry save failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "We could not save your enquiry. Please try again later."
    });
  }
});

// Save a compound-specific quote request (transactional)
app.post("/api/quote-requests", enquiryLimiter, async (req, res) => {
  const {
    customer_name, company_name, email, phone,
    product_name, compound_name, cas_number, quantity, requirements
  } = req.body || {};

  if (
    typeof customer_name !== "string" || !customer_name.trim() ||
    typeof email !== "string" || !email.trim() ||
    typeof product_name !== "string" || !product_name.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Name, email, and product name are required."
    });
  }

  const cleanName = customer_name.trim();
  const cleanEmail = email.trim();

  if (cleanName.length > 200 || cleanEmail.length > 254) {
    return res.status(400).json({
      success: false,
      message: "Name or email exceeds the allowed length."
    });
  }

  if (!EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address."
    });
  }

  let client;
  try {
    client = await pool.connect();
  } catch (error) {
    console.error("Failed to acquire database connection:", error.message);
    return res.status(503).json({
      success: false,
      message: "Service temporarily unavailable. Please try again."
    });
  }

  try {
    await client.query("BEGIN");

    const enquiryResult = await client.query(
      `INSERT INTO enquiries
        (customer_name, company_name, email, phone, enquiry_type,
         product_name, cas_number, quantity, requirements)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, created_at`,
      [
        cleanName,
        clean(company_name, 250),
        cleanEmail,
        clean(phone, 50),
        "Quote Request",
        clean(product_name, 300),
        clean(cas_number, 50),
        clean(quantity, 100),
        clean(requirements, 10000)
      ]
    );

    const enquiry = enquiryResult.rows[0];

    const quoteResult = await client.query(
      `INSERT INTO quote_requests
        (enquiry_id, customer_name, company_name, email, phone,
         product_name, compound_name, cas_number, quantity, requirements)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, enquiry_id, customer_name, company_name, email,
                 phone, product_name, compound_name, cas_number,
                 quantity, status, created_at`,
      [
        enquiry.id,
        cleanName,
        clean(company_name, 250),
        cleanEmail,
        clean(phone, 50),
        clean(product_name, 300),
        clean(compound_name, 300),
        clean(cas_number, 50),
        clean(quantity, 100),
        clean(requirements, 10000)
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Quote request saved successfully.",
      enquiry,
      quote: quoteResult.rows[0]
    });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (e) { /* ignore */ }
    console.error("Quote request save failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "We couldn't save your quote request. Please try again later."
    });
  } finally {
    client.release();
  }
});

// ------------------------------------
// THE WEBSITE ITSELF (SECURE, ALLOW-LIST)
// ------------------------------------

// Unknown /api/... paths return JSON 404 (never fall through to the website)
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, message: "Not found." });
});

// Serve the public site (HTML, CSS, JS, images) from the project folder.
// Only files with these extensions are ever served, and the backend/, node_modules/
// folders and any dotfile (.env, .git ...) are always blocked.
const SITE_ROOT = path.resolve(__dirname, "..");
const PUBLIC_EXTENSIONS = /\.(html|css|js|png|jpe?g|webp|avif|gif|svg|ico|woff2?|webmanifest)$/i;
const BLOCKED_PREFIXES = ["/backend", "/node_modules", "/new folder"];

app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();

  let requestPath;
  try {
    requestPath = decodeURIComponent(req.path);
  } catch (e) {
    return res.status(400).send("Bad request");
  }

  if (requestPath === "/") return next();

  const lower = requestPath.toLowerCase();
  const blocked =
    requestPath.includes("..") ||
    requestPath.includes("\\") ||
    requestPath.includes("\0") ||
    requestPath.split("/").some(segment => segment.startsWith(".")) ||
    BLOCKED_PREFIXES.some(prefix => lower === prefix || lower.startsWith(prefix + "/")) ||
    !PUBLIC_EXTENSIONS.test(requestPath);

  if (blocked) return res.status(404).type("text/plain").send("404 - Page not found");
  next();
});

app.use(express.static(SITE_ROOT, {
  dotfiles: "ignore",
  index: "index.html",
  maxAge: isProduction ? "7d" : 0,
  setHeaders: (res, filePath) => {
    // Pages must always be re-checked so content updates show up immediately
    if (/\.html$/i.test(filePath)) res.setHeader("Cache-Control", "no-cache");
  }
}));

app.use((req, res) => {
  res.status(404).type("text/plain").send("404 - Page not found");
});

// ------------------------------------
// GLOBAL ERROR HANDLER
// ------------------------------------

app.use((err, req, res, next) => {
  // Bad client input (malformed JSON, body too large) is a 4xx, not a server fault
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) console.error("Unhandled error:", err.message);

  res.status(status).json({
    success: false,
    message:
      status === 413 ? "Request is too large." :
      status === 400 ? "Invalid request." :
      status === 500 ? "An unexpected error occurred." : "Request failed."
  });
});

// ------------------------------------
// START SERVER
// ------------------------------------

app.listen(PORT, () => {
  console.log(`SKB backend running on port ${PORT} [${isProduction ? "PRODUCTION" : "DEVELOPMENT"}]`);
});
