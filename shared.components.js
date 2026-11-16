
/* =========================================
   SKB SHARED WEBSITE COMPONENTS
   Navbar and footer for all pages
========================================= */

function renderSKBNavbar(activePage = "") {
    return `
        <header class="navbar">
            <a href="index.html" class="logo"
               aria-label="Shree Khunj Bihari Enterprises Home">
                <img src="images/skb logo.png"
                     alt="Shree Khunj Bihari Enterprises">
            </a>

            <nav aria-label="Main navigation">
                <ul>
                    <li>
                        <a href="index.html"
                           ${activePage === "home" ? 'aria-current="page"' : ""}>
                           Home
                        </a>
                    </li>
                    <li>
                        <a href="index.html#about">About</a>
                    </li>
                    <li>
                        <a href="product.html"
                           ${activePage === "products" ? 'aria-current="page"' : ""}>
                           Products
                        </a>
                    </li>
                    <li>
                        <a href="index.html#contact">Contact</a>
                    </li>
                </ul>
            </nav>

            <button class="quote-btn"
                    type="button"
                    data-skb-open-quote>
                Request Quote
            </button>
        </header>
    `;
}

function renderSKBFooter() {
    return `
        <footer class="footer" id="siteFooter">
            <div class="footer-grid">

                <div class="footer-company">
                    <h2 class="footer-company-name">
                        Shree Khunj Bihari Enterprises
                    </h2>

                    <p class="footer-tagline">
                        QUALITY YOU CAN TRUST
                    </p>

                    <p class="footer-description">
                        Your partner for pharmaceutical impurities,
                        reference standards, laboratory consumables,
                        and analytical solutions.
                    </p>
                </div>

                <div class="footer-links">
                    <h3>Quick Links</h3>
                    <ul>
                        <li><a href="index.html">Home</a></li>
                        <li><a href="index.html#about">About Us</a></li>
                        <li><a href="product.html">Products</a></li>
                        <li><a href="quality.html">Quality &amp; Compliance</a></li>
                        <li><a href="index.html#contact">Contact Us</a></li>
                    </ul>
                </div>

                <div class="footer-contact">
                    <h3>Contact</h3>
                    <p>Please contact us for product availability and quotations.</p>
                    <!-- Add verified business contact details here later. -->
                </div>

                <div class="footer-inquiry">
                    <h3>Quick Inquiry</h3>
                    <p>Tell us briefly what you need.</p>

                    <form class="skb-quick-inquiry">
                        <label class="visually-hidden">
                            Your name
                            <input name="name" type="text"
                                   placeholder="Name" required>
                        </label>

                        <label class="visually-hidden">
                            Your email
                            <input name="email" type="email"
                                   placeholder="Business email" required>
                        </label>

                        <label class="visually-hidden">
                            Your enquiry
                            <textarea name="message"
                                      placeholder="Product or requirement"
                                      required></textarea>
                        </label>

                        <button type="submit">Send Enquiry</button>

                        <p class="skb-inquiry-status"
                           role="status" aria-live="polite"></p>
                    </form>
                </div>

            </div>

            <div class="footer-bottom">
                <p>
                    &copy; ${new Date().getFullYear()}
                    Shree Khunj Bihari Enterprises. All Rights Reserved.
                </p>
            </div>
        </footer>
    `;
}

/* Insert shared components into designated placeholders */
document.addEventListener("DOMContentLoaded", () => {
    const navbarSlot = document.getElementById("skb-navbar");
    const footerSlot = document.getElementById("skb-footer");

    if (navbarSlot) {
        navbarSlot.innerHTML = renderSKBNavbar(
            document.body.dataset.activePage || ""
        );
    }

    if (footerSlot) {
        footerSlot.innerHTML = renderSKBFooter();
    }

    /* Frontend-only footer form: do not pretend it sends */
    document.querySelectorAll(".skb-quick-inquiry").forEach(form => {
        form.addEventListener("submit", event => {
            event.preventDefault();

            const status = form.querySelector(".skb-inquiry-status");

            if (status) {
                status.textContent =
                    "This form is not connected yet. Your enquiry has not been sent.";
            }
        });
    });
});
