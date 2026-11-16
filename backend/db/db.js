"use strict";

const { Pool } = require("pg");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const isProduction = process.env.NODE_ENV === "production";

// SSL is needed for managed cloud databases (Neon, Supabase, RDS...), but a
// Postgres running on the same server (localhost) normally has SSL switched off
// and will REFUSE an SSL connection. Control it explicitly with DB_SSL=true|false.
// If DB_SSL is not set: SSL is used in production unless the DB host is local.
const isLocalDb = ["localhost", "127.0.0.1", "::1"].includes(process.env.DB_HOST);
const useSsl =
  process.env.DB_SSL !== undefined
    ? process.env.DB_SSL.toLowerCase() === "true"
    : isProduction && !isLocalDb;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Connection pool limits
  max: 20,                        // Maximum connections in pool
  idleTimeoutMillis: 30000,       // Close idle connections after 30s
  connectionTimeoutMillis: 5000,  // Timeout if connection takes > 5s

  // SSL for cloud databases (Neon, Supabase, RDS, etc.)
  ...(useSsl && {
    ssl: { rejectUnauthorized: false }
  })
});

pool.on("error", (err) => {
  console.error("FATAL: Unexpected PostgreSQL pool error:", err.message);
  // In production, exit so the process manager (PM2/systemd) restarts the app
  if (isProduction) {
    process.exit(1);
  }
});

module.exports = pool;
