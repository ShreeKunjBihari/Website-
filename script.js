
/* =====================================
   HERO IMAGE AUTO SLIDER
===================================== */

document.addEventListener("DOMContentLoaded", () => {
    const slides = document.querySelectorAll(".slide");

    if (slides.length > 0) {
        let current = 0;

        // Start with only the first slide visible
        slides.forEach((slide, index) => {
            slide.classList.toggle("active", index === 0);
        });

        // Change image every 3 seconds
        if (slides.length > 1) {
            setInterval(() => {
                slides[current].classList.remove("active");

                current = (current + 1) % slides.length;

                slides[current].classList.add("active");
            }, 3000);
        }

        // Report missing image files in the browser console
        slides.forEach((slide) => {
            slide.addEventListener("error", () => {
                console.error("Slider image could not load:", slide.getAttribute("src"));
            });
        });
    }

    /* =====================================
       ANIMATED STATISTICS COUNTERS
    ===================================== */

    const counters = document.querySelectorAll(".counter");

    counters.forEach((counter) => {
        const target = Number(counter.getAttribute("data-target"));

        if (!Number.isFinite(target) || target < 0) {
            return;
        }

        const duration = 1600;
        const startTime = performance.now();

        function updateCounter(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 3);

            counter.textContent = Math.floor(target * easedProgress);

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = `${target}+`;
            }
        }

        requestAnimationFrame(updateCounter);
    });
});




/* =====================================
   HOMEPAGE PRODUCT SEARCH
===================================== */

const homeSearchInput = document.getElementById("homeSearchInput");
const homeSearchBtn = document.getElementById("homeSearchBtn");

function searchFromHomepage() {
    if (!homeSearchInput) return;

    const searchTerm = homeSearchInput.value.trim();

    if (!searchTerm) {
        homeSearchInput.focus();
        return;
    }

    window.location.href =
        "product.html?search=" + encodeURIComponent(searchTerm);
}

if (homeSearchBtn) {
    homeSearchBtn.addEventListener("click", searchFromHomepage);
}

if (homeSearchInput) {
    homeSearchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            searchFromHomepage();
        }
    });
}

/* Explore Products button */
const exploreProductsBtn = document.querySelector(".primary-btn");

if (exploreProductsBtn) {
    exploreProductsBtn.addEventListener("click", () => {
        window.location.href = "product.html";
    });
}



/* =====================================
   REQUEST QUOTE FORM
===================================== */

const quoteModal = document.getElementById("quoteModal");
const closeQuoteBtn = document.getElementById("closeQuoteBtn");
const quoteProduct = document.getElementById("quoteProduct");
const quoteForm = document.getElementById("quoteForm");
const quoteFormStatus = document.getElementById("quoteFormStatus");

const quoteButtons = [
    document.getElementById("navQuoteBtn"),
    document.getElementById("heroQuoteBtn"),
    document.getElementById("ctaQuoteBtn")
].filter(Boolean);

function openQuoteModal() {
    if (!quoteModal) return;

    quoteModal.classList.add("is-open");
    quoteModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    if (quoteFormStatus) {
        quoteFormStatus.textContent = "";
    }
}

function closeQuoteModal() {
    if (!quoteModal) return;

    quoteModal.classList.remove("is-open");
    quoteModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

quoteButtons.forEach(button => {
    button.addEventListener("click", () => {
        if (quoteProduct) {
            quoteProduct.value = "";
        }

        openQuoteModal();
    });
});

if (closeQuoteBtn) {
    closeQuoteBtn.addEventListener("click", closeQuoteModal);
}

if (quoteModal) {
    quoteModal.addEventListener("click", event => {
        if (event.target === quoteModal) {
            closeQuoteModal();
        }
    });
}

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeQuoteModal();
    }
});

/*
   Frontend validation only.
   Email delivery will be connected in a later step.
*/

/* =====================================
   HOMEPAGE QUOTE FORM - BACKEND
===================================== */

if (quoteForm) {
    quoteForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!quoteForm.reportValidity()) return;

        const formData = {
            customer_name: quoteForm.elements["name"].value.trim(),
            company_name: quoteForm.elements["company"].value.trim(),
            email: quoteForm.elements["email"].value.trim(),
            phone: quoteForm.elements["phone"].value.trim(),
            enquiry_type: "Homepage Quote Request",
            product_name: quoteForm.elements["product"].value.trim(),
            cas_number: quoteForm.elements["cas"].value.trim(),
            quantity: quoteForm.elements["quantity"].value.trim(),
            requirements: quoteForm.elements["message"].value.trim()
        };

        const submitButton = quoteForm.querySelector(
            'button[type="submit"]'
        );

        if (submitButton) submitButton.disabled = true;

        if (quoteFormStatus) {
            quoteFormStatus.textContent = "Submitting your enquiry...";
        }

        try {
            const response = await fetch(
                getApiUrl("/api/enquiries"),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(formData)
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Unable to submit your enquiry."
                );
            }

            if (quoteFormStatus) {
                quoteFormStatus.textContent =
                    `Enquiry submitted successfully! Reference ID: ${result.enquiry.id}`;
            }

            quoteForm.reset();

        } catch (error) {
            console.error("Homepage quote submission failed:", error);

            if (quoteFormStatus) {
                quoteFormStatus.textContent =
                    "We could not submit your enquiry. Please try again.";
            }

        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
}

/* =====================================
   FOOTER QUICK INQUIRY FORM
===================================== */
const footerForm = document.getElementById("footerInquiryForm");
const footerStatus = document.getElementById("footerInquiryStatus");
const footerBtn = document.getElementById("footerInquiryBtn");

if (footerForm) {
    footerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nameInput = footerForm.elements["name"];
        const emailInput = footerForm.elements["email"];
        const msgInput = footerForm.elements["message"];

        const formData = {
            customer_name: (nameInput ? nameInput.value : "").trim(),
            company_name: "",
            email: (emailInput ? emailInput.value : "").trim(),
            phone: "",
            enquiry_type: "Footer Quick Inquiry",
            product_name: "",
            cas_number: "",
            quantity: "",
            requirements: (msgInput ? msgInput.value : "").trim()
        };

        if (!formData.customer_name || !formData.email || !formData.requirements) {
            if (footerStatus) footerStatus.textContent = "Please fill in all fields.";
            return;
        }

        if (footerBtn) footerBtn.disabled = true;
        if (footerStatus) footerStatus.textContent = "Submitting...";

        try {
            const response = await fetch(getApiUrl("/api/enquiries"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Failed to submit.");
            }

            if (footerStatus) {
                footerStatus.textContent = `Enquiry sent! Ref: ${result.enquiry.id}`;
                footerStatus.style.color = "#4ade80";
            }
            footerForm.reset();
        } catch (error) {
            console.error("Footer enquiry failed:", error);
            if (footerStatus) {
                footerStatus.textContent = "Could not send enquiry. Try again.";
                footerStatus.style.color = "#f87171";
            }
        } finally {
            if (footerBtn) footerBtn.disabled = false;
        }
    });
}
