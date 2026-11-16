/**
 * Shree Khunj Bihari Enterprises (SKB) - API & Environment Configuration
 * 
 * Automatically detects whether the application is running locally or on a live domain.
 * - Local development: routes API calls to http://localhost:3000
 * - Production domain: routes API calls to relative path "" or your production API host
 */
(function (global) {
    "use strict";

    const isLocal =
        global.location.hostname === "localhost" ||
        global.location.hostname === "127.0.0.1" ||
        global.location.protocol === "file:";

    global.SKB_CONFIG = global.SKB_CONFIG || {
        // Change this if your production backend is hosted on a separate domain (e.g. "https://api.yourdomain.com")
        API_BASE_URL: isLocal ? "http://localhost:3000" : ""
    };

    /**
     * Resolves an API endpoint path to the full URL based on the environment.
     * @param {string} endpoint - The API path, e.g. "/api/products" or "api/enquiries"
     * @returns {string} The full API URL
     */
    global.getApiUrl = function (endpoint) {
        const base = (global.SKB_CONFIG && typeof global.SKB_CONFIG.API_BASE_URL === "string")
            ? global.SKB_CONFIG.API_BASE_URL
            : "";
        const cleanEndpoint = endpoint.startsWith("/") ? endpoint : "/" + endpoint;
        return base + cleanEndpoint;
    };
})(typeof window !== "undefined" ? window : globalThis);

