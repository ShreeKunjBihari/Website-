
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
} else if (!Array.isArray(products)) {
    console.error(
        "Product catalog error: The products array was not loaded. " +
        "Check data/data.js and the A-Z data files."
    );
} else {

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
                <div
                    class="product-card"
                    data-letter="${escapeHTML(firstLetter)}">

                    <a href="${escapeHTML(productLink)}">
                        <span>${name}</span>
                        <span aria-hidden="true">→</span>
                    </a>

                </div>
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

    // ========================================
    // 14. INITIALIZE CATALOG
    // ========================================

    createAlphabetButtons();
    addAlphabetEvents();
    renderProducts();

    console.log(
        `Product catalog initialized: ${products.length} product records loaded.`
    );
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

    form.addEventListener("submit", event => {
        event.preventDefault();

        status.textContent =
            "The enquiry form is ready, but submission is not connected yet. " +
            "Your enquiry has NOT been sent. We will connect it when the backend is built.";
    });
})();
