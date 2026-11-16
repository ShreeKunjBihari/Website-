-- ============================================================
-- Shree Khunj Bihari Enterprises (SKB) Database Schema
-- Database Name: skb_website
-- PostgreSQL 14+
-- ============================================================

-- 1. Parent Pharmaceutical Products (APIs)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(150),
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Specific Chemical Compounds & Impurities
CREATE TABLE IF NOT EXISTS compounds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(350) NOT NULL,
    cas_number VARCHAR(100),
    molecular_formula VARCHAR(100),
    description TEXT,
    image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Relationship table: Product to Compounds
CREATE TABLE IF NOT EXISTS product_compounds (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    compound_id INTEGER NOT NULL REFERENCES compounds(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_product_compound UNIQUE (product_id, compound_id)
);

-- 4. General Customer Inquiries
CREATE TABLE IF NOT EXISTS enquiries (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(200) NOT NULL,
    company_name VARCHAR(250),
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(50),
    enquiry_type VARCHAR(100),
    product_name VARCHAR(300),
    cas_number VARCHAR(50),
    quantity VARCHAR(100),
    requirements TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Compound-Specific Quotation Requests
CREATE TABLE IF NOT EXISTS quote_requests (
    id SERIAL PRIMARY KEY,
    enquiry_id INTEGER REFERENCES enquiries(id) ON DELETE SET NULL,
    customer_name VARCHAR(200) NOT NULL,
    company_name VARCHAR(250),
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(50),
    product_name VARCHAR(300) NOT NULL,
    compound_name VARCHAR(300),
    cas_number VARCHAR(50),
    quantity VARCHAR(100),
    requirements TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast query lookup
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_compounds_cas ON compounds(cas_number);
CREATE INDEX IF NOT EXISTS idx_pc_product_id ON product_compounds(product_id);
CREATE INDEX IF NOT EXISTS idx_pc_compound_id ON product_compounds(compound_id);

