/* =========================================
   PRODUCT DETAIL PAGE
   - Dynamic product and impurity rendering
   - Image zoom with accessible close controls
   - Compound-specific quote requests
========================================= */

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("product");

    let selectedProduct = null;

    if (slug) {
        try {
            const productResponse = await fetch(
                getApiUrl(`/api/products/${encodeURIComponent(slug)}`)
            );

            if (productResponse.ok) {
                const result = await productResponse.json();

                if (result.success && result.product) {
                    selectedProduct = {
                        ...result.product,
                        impurities: result.product.impurities || []
                    };
                }
            }
        } catch (error) {
            console.warn("Backend API unavailable, checking local product dataset:", error);
        }

        // Fallback to static catalog from data/data.js if backend did not supply the product
        if (!selectedProduct && typeof window !== "undefined" && Array.isArray(window.products)) {
            const localMatch = window.products.find(
                p => p && String(p.slug || "").trim().toLowerCase() === slug.trim().toLowerCase()
            );

            if (localMatch) {
                selectedProduct = {
                    ...localMatch,
                    impurities: localMatch.impurities || []
                };
            }
        }
    }

    const productTitle = document.getElementById("productTitle");
    const productDescription =
        document.getElementById("productDescription");
    const impurityGrid = document.getElementById("impurityGrid");

    if (!productTitle || !productDescription || !impurityGrid) {
        console.error("Required product detail HTML elements are missing.");
        return;
    }

    if (!selectedProduct) {
        document.title = "Product Not Found";

        document.querySelector("main").innerHTML = `
            <div class="container">
                <h1>Product Not Found</h1>
                <p>Please return to the product catalog and select a product.</p>
                <a href="product.html">Back to Product Catalog</a>
            </div>
        `;
        return;
    }

    // Display the selected parent product.
    productTitle.textContent = selectedProduct.name || "Product";
    productDescription.textContent =
        selectedProduct.description || "";

    document.title = `${selectedProduct.name || "Product"} | Shree Khunj Bihari Enterprises`;

    const impurities = Array.isArray(selectedProduct.impurities)
        ? selectedProduct.impurities
        : [];

    // Create or update the automatic impurity count.
    let impurityCount = document.getElementById("impurityCount");

    if (!impurityCount) {
        impurityCount = document.createElement("div");
        impurityCount.id = "impurityCount";
        impurityCount.className = "impurity-count";

        productDescription.insertAdjacentElement(
            "afterend",
            impurityCount
        );
    }

    impurityCount.textContent =
        `${impurities.length} ${
            impurities.length === 1 ? "Impurity" : "Impurities"
        } Available`;

    // Quote modal elements.
    const quoteModal = document.getElementById("detailQuoteModal");
    const quoteForm = document.getElementById("detailQuoteForm");
    const quoteClose = document.getElementById("detailQuoteClose");
    const navQuoteBtn = document.getElementById("detailNavQuoteBtn");

    const quoteProduct = document.getElementById("detailQuoteProduct");
    const quoteCompound = document.getElementById("detailQuoteCompound");
    const quoteCas = document.getElementById("detailQuoteCas");
    const quoteStatus = document.getElementById("detailQuoteStatus");

    // Image zoom elements.
    const zoomOverlay = document.getElementById("imageZoomOverlay");
    const zoomPreview = document.getElementById("imageZoomPreview");
    const zoomClose = document.getElementById("imageZoomClose");

    let previouslyFocusedElement = null;

    function openQuoteModal(impurity = null, index = null) {
        if (!quoteModal) return;

        previouslyFocusedElement = document.activeElement;

        quoteProduct.value = selectedProduct.name || "Product";

        if (impurity) {
            quoteCompound.value =
                impurity.name || `Compound ${index + 1}`;

            quoteCas.value =
                impurity.cas ||
                impurity.CAS ||
                impurity.casNumber ||
                "";
        } else {
            quoteCompound.value = "";
            quoteCas.value = "";
        }

        quoteStatus.textContent = "";
        quoteModal.classList.add("is-open");
        quoteModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        const firstInput = quoteForm?.querySelector(
            'input[name="name"]'
        );
        firstInput?.focus();
    }

    function closeQuoteModal() {
        if (!quoteModal) return;

        quoteModal.classList.remove("is-open");
        quoteModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";

        previouslyFocusedElement?.focus();
    }

    function openImageZoom(image) {
        if (!zoomOverlay || !zoomPreview) return;

        zoomPreview.src = image.src;
        zoomPreview.alt = image.alt;
        zoomOverlay.classList.add("is-open");
        zoomOverlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        zoomClose?.focus();
    }

    function closeImageZoom() {
        if (!zoomOverlay || !zoomPreview) return;

        zoomOverlay.classList.remove("is-open");
        zoomOverlay.setAttribute("aria-hidden", "true");
        zoomPreview.src = "";
        document.body.style.overflow = "";
    }

    // Render the impurity cards.
    impurityGrid.replaceChildren();

    if (impurities.length === 0) {
        const emptyMessage = document.createElement("div");
        emptyMessage.className = "no-results";
        emptyMessage.textContent =
            "No impurity records are available for this product right now.";

        impurityGrid.appendChild(emptyMessage);
    } else {
        impurities.forEach((impurity, index) => {
            const card = document.createElement("article");
            card.className = "impurity-card";

            // Compound image.
            if (impurity.image) {
                const image = document.createElement("img");

                image.src = impurity.image;
                image.alt = impurity.name
                    ? `${impurity.name} chemical structure`
                    : `${selectedProduct.name} compound ${index + 1}`;

                image.loading = "lazy";
                image.decoding = "async";
                image.tabIndex = 0;
                image.setAttribute("role", "button");
                image.setAttribute(
                    "aria-label",
                    `Enlarge image of ${impurity.name || `compound ${index + 1}`}`
                );

                image.addEventListener("click", () => {
                    openImageZoom(image);
                });

                image.addEventListener("keydown", event => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openImageZoom(image);
                    }
                });

                card.appendChild(image);
            }

            // Keep the existing optional name; CSS may hide it.
            if (impurity.name) {
                const heading = document.createElement("h3");
                heading.textContent = impurity.name;
                card.appendChild(heading);
            }

            // Quote button for this specific compound.
            const quoteButton = document.createElement("button");
            quoteButton.type = "button";
            quoteButton.className = "impurity-quote-btn";
            quoteButton.textContent = "Request a Quote";

            quoteButton.addEventListener("click", () => {
                openQuoteModal(impurity, index);
            });

            card.appendChild(quoteButton);
            impurityGrid.appendChild(card);
        });
    }

    // Navbar quote button: opens a general quote for this product.
    navQuoteBtn?.addEventListener("click", () => {
        openQuoteModal();
    });

    quoteClose?.addEventListener("click", closeQuoteModal);

    quoteModal?.addEventListener("click", event => {
        if (event.target === quoteModal) {
            closeQuoteModal();
        }
    });

    // Image zoom close controls.
    zoomClose?.addEventListener("click", closeImageZoom);

    zoomOverlay?.addEventListener("click", event => {
        if (event.target === zoomOverlay) {
            closeImageZoom();
        }
    });

    
    
    // Submit quote request to the dedicated quote endpoint.
    quoteForm?.addEventListener("submit", async event => {
        event.preventDefault();

        const formData = new FormData(quoteForm);
        const getValue = name =>
            String(formData.get(name) || "").trim();

        const submitButton = quoteForm.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        const originalButtonText = submitButton
            ? submitButton.textContent
            : "";

        const payload = {
            customer_name: getValue("name"),
            company_name: getValue("company"),
            email: getValue("email"),
            phone: getValue("phone"),
            product_name: quoteProduct.value.trim(),
            compound_name: quoteCompound.value.trim(),
            cas_number: getValue("cas") || quoteCas.value.trim(),
            quantity: getValue("quantity"),
            requirements: getValue("message")
        };

        quoteStatus.textContent = "";

        if (
            !payload.customer_name ||
            !payload.email ||
            !payload.product_name ||
            !payload.requirements
        ) {
            quoteStatus.textContent =
                "Please complete your name, email, product, and requirements.";
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Submitting...";
        }

        try {
            const response = await fetch(
                getApiUrl("/api/quote-requests"),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "The server could not save the quote."
                );
            }

            quoteStatus.textContent =
                `Quote request saved successfully! Reference ID: ${result.quote.id}`;

            quoteStatus.classList.remove("status-warning");
            quoteForm.reset();
        } catch (error) {
            console.error("Quote request submission failed:", error);

            quoteStatus.textContent =
                "We couldn't submit your quote request. Please try again.";

            quoteStatus.classList.add("status-warning");
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        }
    });



    // Escape closes whichever overlay is open.
    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;

        if (zoomOverlay?.classList.contains("is-open")) {
            closeImageZoom();
        } else if (quoteModal?.classList.contains("is-open")) {
            closeQuoteModal();
        }
    });
});