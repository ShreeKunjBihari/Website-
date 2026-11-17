
"use strict";

// ========================================
// 1. PRODUCT CATALOG CONFIGURATION
// ========================================

const PAGE_SIZE = 20;

let visibleCount = PAGE_SIZE;
let selectedLetter = "ALL";
let searchTerm = "";

// ========================================
// 2. HTML ELEMENTS
// ========================================

const searchInput = document.getElementById("searchInput");
const productGrid = document.getElementById("productGrid");
const alphabetFilter = document.getElementById("alphabetFilter");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const productCount = document.getElementById("productCount");

// Create an empty-state message if HTML does not contain one.
let noProductsMessage =
    document.getElementById("noProductsMessage");

if (!noProductsMessage && productGrid) {
    noProductsMessage = document.createElement("p");
    noProductsMessage.id = "noProductsMessage";
    noProductsMessage.className = "no-products-message";
    noProductsMessage.hidden = true;

    productGrid.after(noProductsMessage);
}

// ========================================
// 3. VALIDATE REQUIRED HTML ELEMENTS
// ========================================

if (
    !searchInput ||
    !productGrid ||
    !alphabetFilter ||
    !loadMoreBtn
) {
    console.error(
        "Product catalog error: Check searchInput, " +
        "productGrid, alphabetFilter and loadMoreBtn IDs in product.html."
    );
} else {
    let products = [];

    
async function loadProductsFromAPI() {
    try {
        const response = await fetch(getApiUrl("/api/products"));

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success || !Array.isArray(data.products)) {
            throw new Error("The API returned an invalid products list.");
        }

        products = data.products;

        console.log(`Loaded ${products.length} products from PostgreSQL.`);
        createAlphabetButtons();
        addAlphabetEvents();
        renderProducts();

    } catch (error) {
        console.warn("Backend API unavailable, attempting fallback to static catalog data:", error);

        // Fallback to static catalog from data/data.js if available
        if (typeof window !== "undefined" && Array.isArray(window.products) && window.products.length > 0) {
            products = window.products;
            console.log(`Loaded ${products.length} products from local static catalog.`);
            createAlphabetButtons();
            addAlphabetEvents();
            renderProducts();
            return;
        }

        productGrid.innerHTML = "";
        productGrid.hidden = false;
        noProductsMessage.textContent =
            "We couldn't load products right now. Please refresh the page and try again.";
        noProductsMessage.hidden = false;
        loadMoreBtn.hidden = true;
    }
}

    // ========================================
    // 4. HELPER FUNCTIONS
    // ========================================

    function escapeHTML(value) {
        return String(value ?? "").replace(
            /[&<>"']/g,
            character => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[character]
        );
    }

    function getProductName(product) {
        return String(product.name ?? "").trim();
    }

    // ========================================
    // 5. CREATE ALPHABET BUTTONS
    // ========================================

    function createAlphabetButtons() {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

        alphabetFilter.innerHTML = `
            <button
                type="button"
                class="alphabet-btn active"
                data-letter="ALL"
                aria-pressed="true">
                All
            </button>
        `;

        letters.forEach(letter => {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "alphabet-btn";
            button.dataset.letter = letter;
            button.textContent = letter;
            button.setAttribute("aria-pressed", "false");

            alphabetFilter.appendChild(button);
        });
    }

    // ========================================
    // 6. FILTER ALL PRODUCTS
    // ========================================


    
function getFilteredProducts() {
    return products.filter(product => {
        if (!product || !getProductName(product)) {
            return false;
        }

        const name = getProductName(product);
        const normalizedName = name.toUpperCase();

        const matchesLetter =
            selectedLetter === "ALL" ||
            normalizedName.startsWith(selectedLetter);

        // Search parent product information.
        const searchableParts = [
            name,
            product.slug ?? "",
            product.description ?? ""
        ];

        // Also search all related impurity names and CAS numbers.
        const impurities = Array.isArray(product.impurities)
            ? product.impurities
            : [];

        impurities.forEach(impurity => {
            if (!impurity) return;

            searchableParts.push(
                impurity.name ?? "",
                impurity.cas ?? "",
                impurity.formula ?? ""
            );
        });

        const searchableText = searchableParts
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            searchableText.includes(searchTerm);

        return matchesLetter && matchesSearch;
    });
}


   

    // ========================================
    // 7. RENDER PRODUCT CARDS
    // ========================================

    function renderProducts() {
        const filteredProducts = getFilteredProducts();

        const visibleProducts = filteredProducts.slice(
            0,
            visibleCount
        );

        productGrid.innerHTML = visibleProducts.map(product => {
            const name = escapeHTML(getProductName(product));
            const firstLetter = getProductName(product)
                .charAt(0)
                .toUpperCase();

            const slug = product.slug;

            // A valid slug is required for the detail page.
            const productLink = slug
                ? `product-detail.html?product=${encodeURIComponent(slug)}`
                : "#";

            return `
                <a
                    href="${escapeHTML(productLink)}"
                    class="product-card"
                    data-letter="${escapeHTML(firstLetter)}">

                    <span>${name}</span>
                    <span aria-hidden="true">→</span>

                </a>
            `;
        }).join("");

        // ========================================
        // 8. AUTOMATIC PRODUCT COUNT
        // ========================================

        if (productCount) {
            if (
                searchTerm !== "" ||
                selectedLetter !== "ALL"
            ) {
                productCount.textContent =
                    `${filteredProducts.length} Products Found`;
            } else {
                productCount.textContent =
                    `${products.filter(product =>
                        product && getProductName(product)
                    ).length} Products Available`;
            }
        }

        // ========================================
        // 9. EMPTY-STATE MESSAGES
        // ========================================

        if (filteredProducts.length === 0) {
            if (selectedLetter !== "ALL" && searchTerm === "") {
                noProductsMessage.textContent =
                    `No products available under ${selectedLetter} right now.`;
            } else if (searchTerm !== "") {
                noProductsMessage.textContent =
                    "No matching products found. Try another search.";
            } else {
                noProductsMessage.textContent =
                    "No products are available right now.";
            }

            noProductsMessage.hidden = false;
            productGrid.hidden = true;
        } else {
            noProductsMessage.hidden = true;
            productGrid.hidden = false;
        }

        // ========================================
        // 10. LOAD MORE BUTTON
        // ========================================

        const hasMoreProducts =
            visibleCount < filteredProducts.length;

        loadMoreBtn.hidden = !hasMoreProducts;

        loadMoreBtn.disabled = !hasMoreProducts;

        loadMoreBtn.textContent = "Load More";
    }

    // ========================================
    // 11. ALPHABET FILTER EVENTS
    // ========================================

    function addAlphabetEvents() {
        alphabetFilter.addEventListener("click", event => {
            const button = event.target.closest(".alphabet-btn");

            if (!button || !alphabetFilter.contains(button)) {
                return;
            }

            selectedLetter = button.dataset.letter;

            // Reset pagination when changing letters.
            visibleCount = PAGE_SIZE;

            alphabetFilter
                .querySelectorAll(".alphabet-btn")
                .forEach(btn => {
                    const isActive = btn === button;

                    btn.classList.toggle("active", isActive);
                    btn.setAttribute(
                        "aria-pressed",
                        String(isActive)
                    );
                });

            renderProducts();
        });
    }

    // ========================================
    // 12. SEARCH EVENTS
    // ========================================

    searchInput.addEventListener("input", () => {
        searchTerm = searchInput.value.trim().toLowerCase();

        // Start from the first page for each new search.
        visibleCount = PAGE_SIZE;

        renderProducts();
    });

    // ========================================
    // 13. LOAD MORE EVENTS
    // ========================================

    loadMoreBtn.addEventListener("click", () => {
        visibleCount += PAGE_SIZE;
        renderProducts();
    });

   // 14. INITIALIZE CATALOG FROM BACKEND

     loadProductsFromAPI();
     
}



/* =====================================
   SEARCH FROM HOMEPAGE
===================================== */

const catalogSearchParams = new URLSearchParams(window.location.search);
const homepageSearchTerm = catalogSearchParams.get("search");

if (homepageSearchTerm) {
    const catalogSearchInput = document.getElementById("searchInput");

    if (catalogSearchInput) {
        catalogSearchInput.value = homepageSearchTerm;

        // Trigger the catalog's existing search listener
        catalogSearchInput.dispatchEvent(
            new Event("input", { bubbles: true })
        );
    }
}


/* =========================================
   CATALOG REQUEST QUOTE POPUP
========================================= */

(() => {
    const openButton = document.getElementById("catalogQuoteBtn");
    const modal = document.getElementById("catalogQuoteModal");
    const closeButton = document.getElementById("catalogQuoteClose");
    const form = document.getElementById("catalogQuoteForm");
    const status = document.getElementById("catalogQuoteStatus");

    if (!openButton || !modal || !closeButton || !form || !status) {
        return;
    }

    function openModal() {
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        form.querySelector('input[name="name"]')?.focus();
    }

    function closeModal() {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        openButton.focus();
    }

    openButton.addEventListener("click", openModal);
    closeButton.addEventListener("click", closeModal);

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && modal.classList.contains("is-open")) {
            closeModal();
        }
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const formData = {
            customer_name: (form.querySelector('input[name="name"]')?.value || "").trim(),
            company_name: (form.querySelector('input[name="company"]')?.value || "").trim(),
            email: (form.querySelector('input[name="email"]')?.value || "").trim(),
            phone: (form.querySelector('input[name="phone"]')?.value || "").trim(),
            enquiry_type: "Catalog Quote Request",
            product_name: (form.querySelector('input[name="product"]')?.value || "").trim(),
            cas_number: "",
            quantity: "",
            requirements: (form.querySelector('textarea[name="message"]')?.value || "").trim()
        };

        if (!formData.customer_name || !formData.email || !formData.requirements) {
            status.textContent = "Please fill in your name, email, and requirements.";
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        status.textContent = "Submitting your enquiry...";

        try {
            const response = await fetch(getApiUrl("/api/enquiries"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Failed to submit enquiry.");
            }

            status.textContent = `Enquiry submitted successfully! Reference ID: ${result.enquiry.id}`;
            form.reset();
        } catch (error) {
            console.error("Catalog quote submission error:", error);
            status.textContent = "We could not submit your enquiry. Please try again later.";
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
})();
