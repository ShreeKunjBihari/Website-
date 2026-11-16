# Shree Khunj Bihari Enterprises (SKB) — Pharma Impurities & Reference Standards Portal

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Platform: Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Database: PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791.svg)](https://www.postgresql.org/)

**Shree Khunj Bihari Enterprises** (*Serves Quality & Trust*) is a specialized B2B web portal and digital catalog for pharmaceutical reference standards, chemical impurities, metabolites, analytical instruments, and laboratory consumables.

The platform enables pharmaceutical scientists, analytical research and development (R&D) laboratories, quality control (QC) teams, contract research organizations (CROs), and procurement managers to search, inspect, and request quotations for high-purity chemical compounds and laboratory solutions.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [What the Website Does (Key Capabilities)](#what-the-website-does-key-capabilities)
3. [Technology Stack](#technology-stack)
4. [Architecture & System Flow](#architecture--system-flow)
5. [Directory & File Structure](#directory--file-structure)
6. [Database Schema & Data Models](#database-schema--data-models)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Data Ingestion & ETL Pipeline](#data-ingestion--etl-pipeline)
9. [Installation & Local Setup](#installation--local-setup)
10. [Future Enhancements & Recommendations](#future-enhancements--recommendations)

---

## Executive Summary

Pharmaceutical impurity profiling and analytical quality control require exact reference standards with verified chemical structures, CAS registry numbers, and molecular formulas. 

This website serves as the primary digital customer portal for Shree Khunj Bihari Enterprises. It provides:
- An extensive, searchable A-Z chemical catalog of Active Pharmaceutical Ingredients (APIs) and their respective degradation products, impurities, and related compounds.
- Detailed chemical visualizations, allowing researchers to inspect 2D molecular structures with high-resolution lightbox zoom controls.
- An integrated quotation and lead-generation engine that connects prospective B2B clients directly to the enterprise sales and synthesis team.

---

## What the Website Does (Key Capabilities)

### 1. Alphabetical & Multi-Attribute Chemical Catalog
- **A–Z Filtering**: Browse products systematically from A to Z or view the entire repository.
- **Deep Search**: Instant client-side and server-side searching across multiple fields:
  - Parent drug name (e.g., *Abacavir*, *Baclofen*, *Cabazitaxel*, *Ebastine*)
  - Specific impurity and compound names (e.g., *EP Impurity A*, *Base*, *Metabolite*)
  - Chemical Abstracts Service (CAS) Registry Numbers (e.g., `136470-78-5`)
  - Molecular formulas (e.g., `C14H18N6O`)
  - Compound slugs and descriptions
- **Dynamic Pagination**: Incremental loading via a "Load More Products" control (20 items per view) with real-time counters displaying available and filtered counts.

### 2. Product Detail & Chemical Impurity Showcase
- **Dynamic Routing**: Individual product landing pages driven by URL query parameters (`product-detail.html?product=<slug>`).
- **Compound Grid**: Renders all known impurity variants associated with a parent drug molecule.
- **Structure Lightbox (Image Zoom)**: Fullscreen accessible lightbox allowing chemists to examine fine structural details, stereochemistry, and functional groups. Includes keyboard accessibility (`Enter`/`Space` to open, `Escape` to close).

### 3. Dual-Tier Quotation & Inquiry Engine
- **Global Inquiries**: Visitors can submit general RFQs (Request for Quotations) or inquiry tickets from the header navigation, hero banner, or contact forms.
- **Compound-Specific RFQs**: Clicking "Request a Quote" on any individual impurity automatically pre-populates the parent drug name, compound title, and CAS number into the modal form, minimizing customer friction.
- **Transactional Database Persistence**: Submissions are committed transactionally to a PostgreSQL database with relational linkage between general customer contacts and specific quote line items.

### 4. Informational & Compliance Pages
- **Home (`index.html`)**: Features an automated lab facility carousel, dynamic statistic counters (500+ Products, 100+ Clients, 25+ Countries, 99% Purity Standards), product categories, and quick RFQ modals.
- **About Us (`about.html`)**: Corporate background, mission statement, and pharmaceutical industries served.
- **Quality & Compliance (`quality.html`)**: Details on quality control standards, analytical characterization (HPLC, NMR, MS), Certificate of Analysis (COA) documentation, and custom synthesis support.
- **Contact Us (`contact.html`)**: Interactive communication forms and direct business contact details.

---

## Technology Stack

### Frontend
| Technology | Description |
|---|---|
| **HTML5** | Semantic markup across multi-page architecture (`index.html`, `product.html`, `product-detail.html`, `about.html`, `quality.html`, `contact.html`). |
| **CSS3** | Modern responsive design with CSS Grid, Flexbox, custom variables, smooth transitions, modal overlays, and mobile navigation. |
| **JavaScript (ES6+)** | Pure Vanilla JS with no heavy client framework overhead. Utilizes async/await, Fetch API, DOM manipulation, URLSearchParams, and event delegation. |

### Backend & Middleware
| Technology | Description |
|---|---|
| **Node.js** | Server-side JavaScript runtime environment. |
| **Express.js (v5)** | Fast, minimalist HTTP web framework providing RESTful API endpoints, request validation, and static asset serving. |
| **CORS** | Cross-Origin Resource Sharing middleware enabling secure API access from front-end clients. |
| **dotenv** | Environment configuration management for database credentials and server ports. |

### Database & Data Storage
| Technology | Description |
|---|---|
| **PostgreSQL** | Relational SQL database maintaining normalized catalogs, impurities, customer inquiries, and quote records. |
| **pg (node-postgres)** | PostgreSQL client connection pool with error handling and transaction (`BEGIN` / `COMMIT` / `ROLLBACK`) support. |
| **Static File Fallback (`data/*.js`)** | JavaScript modules providing static catalog fallback for offline or standalone client deployments. |

---

## Architecture & System Flow

```
                      +------------------------------------------+
                      |               Client Web App             |
                      |  (HTML5 / CSS3 / Vanilla JavaScript ES6) |
                      +---------------------+--------------------+
                                            |
                         HTTP / REST API    | Static Image Assets
                         (Fetch JSON)       | (Chemical Structures)
                                            v
                      +------------------------------------------+
                      |         Node.js / Express Server         |
                      |           (backend/server.js)            |
                      +---------------------+--------------------+
                                            |
                                            | node-postgres (pg pool)
                                            v
                      +------------------------------------------+
                      |           PostgreSQL Database            |
                      |  (products, compounds, enquiries, etc.)  |
                      +------------------------------------------+
```

### Data Flow Overview:
1. **Catalog Browsing**: The user navigates to `product.html`. `product.js` issues a `GET /api/products` request to the backend.
2. **Data Presentation**: PostgreSQL aggregates compounds and parent drugs into JSON (`json_agg`), returning an alphabetized catalog that is rendered into responsive product cards.
3. **Product Inspection**: Clicking a product navigates to `product-detail.html?product=<slug>`, loading structural images and specific impurity records.
4. **Quote Request**: The client submits an inquiry form. Express receives the request, validates mandatory fields, opens a database transaction, records the customer inquiry in `enquiries`, creates the linked quote in `quote_requests`, and commits the transaction.

---

## Directory & File Structure

```text
Shree khunj bihari/
│
├── index.html                  # Homepage (hero slider, stats, categories, quick RFQ)
├── about.html                  # About Us & corporate background
├── product.html                # Main product catalog with search & A-Z filters
├── product-detail.html         # Individual product view with impurity cards & zoom
├── quality.html                # Quality, compliance, COA & testing standards
├── contact.html                # Customer contact & inquiry page
│
├── style.css                   # Homepage & global base styles
├── about.css                   # Styles for the About Us page
├── product.css                 # Catalog, product cards, detail grid & lightbox styles
├── quality.css                 # Quality & compliance page styling
├── contact.css                 # Contact page layout & form styling
│
├── script.js                   # Homepage slider, counter animations & quote modal
├── product.js                  # Catalog fetching, filtering, search & pagination logic
├── product-backup.js           # Client-side fallback version of catalog logic
├── shared.components.js        # Reusable component templates (Navbar, Footer)
│
├── products/
│   └── products/
│       └── product-detail.js   # Product detail rendering, lightbox, & RFQ submission
│
├── data/                       # Static dataset backup (letters A through Z)
│   ├── a.js ... z.js           # Impurities, CAS numbers, formulas, and image paths
│   └── data.js                 # Aggregates all letter modules (productsA - productsZ)
│
├── backend/                    # Node.js / Express API Server
│   ├── server.js               # Main Express application, routes & static image host
│   ├── package.json            # Backend dependencies (express, pg, cors, dotenv)
│   ├── .env                    # Database connection strings and environment config
│   ├── db/
│   │   └── db.js               # PostgreSQL connection pool configuration
│   └── scripts/
│       ├── import-products.js  # ETL script importing data/*.js into PostgreSQL
│       └── import-products-preview-backup.js
│
├── images/                     # Corporate logos, laboratory banners & UI graphics
│   ├── skb logo.png            # Primary brand logo
│   ├── scientist.jpg           # Lab hero banner
│   ├── pharma-qc-lab-layout.webp
│   └── analytical_lab_RND_...avif
│
└── [Abacavir, E, F, b, c, d...]/ # 2D chemical structure diagrams for drug molecules
```

---

## Database Schema & Data Models

The system uses a normalized relational schema in PostgreSQL:

### 1. `products`
Holds the parent pharmaceutical drugs / Active Pharmaceutical Ingredients (APIs).
- `id` (SERIAL / Primary Key)
- `name` (VARCHAR / TEXT): Brand or generic drug name (e.g., *Abacavir*).
- `slug` (VARCHAR UNIQUE): URL slug for routing (e.g., `abacavir`).
- `description` (TEXT): Pharmacological overview and applications.
- `category` (VARCHAR): Product classification.
- `image_url` (VARCHAR): Optional representative drug image.
- `is_active` (BOOLEAN DEFAULT TRUE): Visibility status.

### 2. `compounds`
Holds specific chemical entities, impurities, metabolites, and reference standards.
- `id` (SERIAL / Primary Key)
- `name` (VARCHAR / TEXT): Compound / impurity title (e.g., *Abacavir EP Impurity A*).
- `cas_number` (VARCHAR): Chemical Abstracts Service identifier.
- `molecular_formula` (VARCHAR): Hill notation formula (e.g., `C14H18N6O`).
- `description` (TEXT): Chemical details.
- `image_url` (VARCHAR): File path to 2D chemical structure image.

### 3. `product_compounds`
Many-to-many join table mapping compounds to their parent product.
- `product_id` (INTEGER, FK -> `products.id`)
- `compound_id` (INTEGER, FK -> `compounds.id`)
- `display_order` (INTEGER): Catalog sort position.

### 4. `enquiries`
Customer contact submissions from the homepage, contact form, or quote modals.
- `id` (SERIAL / Primary Key)
- `customer_name` (VARCHAR)
- `company_name` (VARCHAR)
- `email` (VARCHAR)
- `phone` (VARCHAR)
- `enquiry_type` (VARCHAR)
- `product_name` (VARCHAR)
- `cas_number` (VARCHAR)
- `quantity` (VARCHAR)
- `requirements` (TEXT)
- `created_at` (TIMESTAMP DEFAULT NOW())

### 5. `quote_requests`
Specific quotation lines linked to an overarching customer inquiry.
- `id` (SERIAL / Primary Key)
- `enquiry_id` (INTEGER, FK -> `enquiries.id`)
- `customer_name`, `company_name`, `email`, `phone`
- `product_name`, `compound_name`, `cas_number`, `quantity`, `requirements`
- `status` (VARCHAR DEFAULT 'pending')
- `created_at` (TIMESTAMP DEFAULT NOW())

---

## API Endpoints Reference

Base URL: `http://localhost:3000`

| Method | Endpoint | Description | Request Body / Parameters |
|---|---|---|---|
| `GET` | `/` | Root health check | None |
| `GET` | `/api/health` | Backend status monitor | None |
| `GET` | `/api/db-test` | Verifies active PostgreSQL connection | None |
| `GET` | `/api/products` | Retrieves all active products with aggregated impurity lists | None |
| `POST` | `/api/enquiries` | Submits a general customer inquiry | JSON: `customer_name`, `company_name`, `email`, `phone`, `enquiry_type`, `product_name`, `cas_number`, `quantity`, `requirements` |
| `POST` | `/api/quote-requests` | Submits a specific product/compound quote request | JSON: `customer_name`, `company_name`, `email`, `phone`, `product_name`, `compound_name`, `cas_number`, `quantity`, `requirements` |
| `GET` | `/images/*` | Static file server for chemical diagrams | Static file route |

---

## Data Ingestion & ETL Pipeline

The repository includes a dedicated Node.js ETL (Extract, Transform, Load) script (`backend/scripts/import-products.js`) to migrate catalog data from static JavaScript array files into the PostgreSQL database.

### How the Importer Works:
1. **Extraction**: Iterates through letters `a.js` through `z.js` located in `data/`.
2. **Safe Parsing**: Evaluates file contents inside an isolated Node.js `vm` (Virtual Machine) context without modifying global runtime state.
3. **Sanitization & Normalization**: Standardizes chemical compound names, trims whitespace, verifies CAS numbers, and discards empty records.
4. **Dry-Run Mode**: By default, reports product counts, impurity entries, and missing fields without modifying database tables.
5. **Transactional Loading**: When run with `IMPORT_CONFIRM=YES`, executes a complete SQL transaction (`BEGIN` / `COMMIT`) inserting parent products, child compounds, and relational links.

---

## Installation & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or later)
- [PostgreSQL](https://www.postgresql.org/) (v14.x or later)
- Any static HTTP server (e.g. VS Code Live Server, `npx serve`, or Python's `http.server`)

### Step 1: Clone or Navigate to the Workspace
```bash
cd "Shree khunj bihari"
```

### Step 2: Configure Backend Environment Variables
Create or verify `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=skb_website
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3000
```

### Step 3: Set Up Database Tables
Create the database in PostgreSQL:
```sql
CREATE DATABASE skb_website;
```

Run your schema creation script to initialize `products`, `compounds`, `product_compounds`, `enquiries`, and `quote_requests`.

### Step 4: Install Dependencies & Run Database Import
```bash
cd backend
npm install

# Preview import statistics (Dry Run)
npm run import:products

# Run live import to populate database
IMPORT_CONFIRM=YES npm run import:products
```

### Step 5: Start the Backend Server
```bash
npm start
# Server starts on http://localhost:3000
```

### Step 6: Launch the Frontend
Serve the root directory using any local development server:
```bash
# Example using npx serve
cd ..
npx serve .
```
Open `http://localhost:3000` (backend) and `http://localhost:5000` or `index.html` (frontend) in your browser.

---

## Future Enhancements & Recommendations

1. **Dedicated Single-Product Endpoint**:
   Add `GET /api/products/:slug` to `backend/server.js` to streamline direct page loads on `product-detail.html`.
2. **Email Notification Service**:
   Integrate Nodemailer or a transactional email provider (SendGrid, AWS SES) in `/api/quote-requests` so that the sales team receives immediate email alerts upon new quotation submissions.
3. **Administrative Dashboard**:
   Build an internal admin panel to manage product listings, upload chemical structure PNGs, and manage quotation pipeline statuses (`pending`, `reviewed`, `quoted`).
4. **Automated Search Suggestions**:
   Add instant debounced typeahead search suggestions on the homepage search bar for quick navigation.

---

## Author & Attribution

- **Company**: Shree Khunj Bihari Enterprises
- **Domain**: Pharmaceutical Impurities, Working Standards & Analytical Lab Consumables
- **Website**: [Pharma Impurities](index.html)
- **Year**: 2026

