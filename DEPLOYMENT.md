# Taking Shree Khunj Bihari live (GoDaddy domain + search engines)

Replace `skunj.com` everywhere below with your real domain.

How the site is built: ONE Node.js app (`backend/server.js`) serves the website pages **and** the API
(`/api/...`) from the same address. It needs a PostgreSQL database. So you need three things:
**a server to run it, a database, and your domain pointed at the server.**

---

## 1. Before you deploy (do these first)

- [ ] Replace the placeholder footer contact details in `index.html` (lines ~353-355: `info@pharma.com`, `+91 XXXXX XXXXX`).
- [ ] Decide your canonical address: `https://skunj.com` or `https://www.skunj.com`. Put it in `SITE_URL`.
- [ ] Add real address/phone/email to the Contact page if not already there (helps trust and local search).
- [ ] Data: `G/Gabapentin 9.png` is listed in `data/g.js` but the image file does not exist. Add the file or remove that entry.
- [ ] Data: Haloperidol Decanoate lists image 1 twice (entries 1 and 6 in `data/h.js`). Check if that is intended.
- [ ] Never upload or share `backend/.env` (it holds your database password). Use `backend/.env.example` as the template.

---

## 2. Option A (recommended): one small Linux server (VPS)

Any provider works (DigitalOcean, Hostinger VPS, AWS Lightsail, Vultr...). Choose **Ubuntu 24.04 LTS, 1-2 GB RAM**,
a region close to your customers (Mumbai/Singapore). Note the server's **IP address**.

### 2.1 Point GoDaddy at the server
GoDaddy -> My Products -> your domain -> **DNS**.
1. Delete any default "Parked" A record and any "forwarding" for `@` and `www`.
2. Add / edit:
   | Type | Name | Value | TTL |
   |------|------|-------|-----|
   | A | `@` | your server IP | 600 |
   | A | `www` | your server IP | 600 |
3. Wait 10-60 minutes (up to 24h). Check with: `nslookup skunj.com`.

### 2.2 Set up the server (SSH in as root)
```bash
apt update && apt upgrade -y
apt install -y nginx postgresql certbot python3-certbot-nginx unzip ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs
npm install -g pm2

ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
```

### 2.3 Database
```bash
sudo -u postgres psql <<'SQL'
CREATE USER skb_app WITH PASSWORD 'PUT_A_LONG_RANDOM_PASSWORD_HERE';
CREATE DATABASE skb_website OWNER skb_app;
SQL
```

### 2.4 Upload and start the app
Upload the project zip (e.g. with `scp`, or WinSCP/FileZilla) to the server, then:
```bash
mkdir -p /var/www/skb && cd /var/www/skb && unzip ~/Shree_khunj_bihari_ready.zip
cd backend
cp .env.example .env && chmod 600 .env && nano .env     # set SITE_URL, DB_PASSWORD (DB_SSL=false)
npm ci --omit=dev

# create tables, then load the 62 products
PGPASSWORD='your-db-password' psql -h localhost -U skb_app -d skb_website -f schema.sql
IMPORT_CONFIRM=YES npm run import:products

NODE_ENV=production pm2 start server.js --name skb
pm2 save && pm2 startup        # run the command it prints so the app restarts after a reboot
curl http://localhost:3000/api/health       # -> {"success":true,"status":"healthy"}
```

### 2.5 Nginx + free HTTPS
Create `/etc/nginx/sites-available/skb`:
```nginx
server {
    listen 80;
    server_name skunj.com www.skunj.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
```bash
ln -s /etc/nginx/sites-available/skb /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
certbot --nginx -d skunj.com -d www.skunj.com      # say Yes to redirecting HTTP -> HTTPS
```
Certbot renews the certificate automatically. Visit `https://skunj.com` - done.

---

## 3. Option B: managed platform (less server work)

Render / Railway style: create a **Web Service** from your GitHub repo and a **PostgreSQL** database.
- Build command: `cd backend && npm ci --omit=dev`  | Start command: `cd backend && npm start`
- Environment variables: everything in `.env.example`, with `DB_SSL=true` and the database details the platform shows.
- Run the schema + import once from the platform's shell (`psql ... -f backend/schema.sql`, then `IMPORT_CONFIRM=YES npm run import:products`).
- Add your custom domain in the platform and enter the DNS records **it shows you** at GoDaddy (usually an A record for `@` and a CNAME for `www`).
- Use a paid plan: free plans put the app to sleep (slow first load, bad for Google and customers) and some free databases expire.

---

## 4. After it is live: test checklist
- `https://skunj.com` loads, padlock shown; `http://` and `www.` redirect to your canonical address.
- Product catalog loads (62 products); open a product; images show.
- Submit the Contact form and one "Request a Quote" - then check it arrived (section 6).
- `https://skunj.com/robots.txt` and `https://skunj.com/sitemap.xml` open (sitemap lists 67 URLs).
- `https://skunj.com/backend/.env` and `/backend/server.js` must show "404 - Page not found".

---

## 5. Getting found on Google and Bing

1. **Google Search Console** (search.google.com/search-console) -> Add property -> **Domain** -> enter `skunj.com`.
   Google shows a TXT record; add it in GoDaddy DNS (Type TXT, Name `@`), then click Verify.
2. In Search Console -> **Sitemaps** -> submit `sitemap.xml`.
3. **URL Inspection** -> paste `https://skunj.com/` -> **Request indexing**. Repeat for About, Products, Contact.
4. **Bing Webmaster Tools** (bing.com/webmasters) -> sign in -> **Import from Google Search Console** (one click).
   This also covers Yahoo and DuckDuckGo.
5. Check progress with `site:skunj.com` in Google. First pages usually appear in a few days to a few weeks;
   nobody can guarantee a date or ranking.
6. Create a free **Google Business Profile** and list the site on trade directories (IndiaMART, TradeIndia, LinkedIn
   company page). Links from them help a new domain get discovered.

### What will limit your ranking (be aware)
- Compound names and CAS numbers are only **inside the PNG images**, so Google cannot read them. Buyers search by
  name/CAS (e.g. "Ibuprofen EP Impurity A 66622-47-7"). Adding those as real text on each product page is the single
  biggest SEO improvement. The database already has `cas_number` and `molecular_formula` columns for this.
- Product pages are built by JavaScript from the API. Google can handle this, but it is slower than plain HTML.
- A new domain needs time and a few quality links before it ranks for competitive terms.

---

## 6. Running it day to day
- **Enquiries and quote requests are only saved in the database - nobody is emailed.** View them:
  ```bash
  sudo -u postgres psql -d skb_website -c "SELECT id, created_at, customer_name, email, phone, product_name, requirements FROM enquiries ORDER BY id DESC LIMIT 20;"
  ```
  Ask for email notifications to be added so you never miss a lead.
- **Backups:** `sudo -u postgres pg_dump skb_website > skb_$(date +%F).sql` (schedule it daily, copy off the server).
- **Logs:** `pm2 logs skb`. **Restart:** `pm2 restart skb`. **Update the site:** upload changed files, then `pm2 restart skb`.
- Keep the server updated (`apt update && apt upgrade`) and run `npm audit` now and then.
