/**
 * Dynamic Configuration — Works Locally & in Production
 * 
 * This file automatically detects the environment and sets the API endpoint:
 * - Local development: http://localhost:3000
 * - Production (Render, etc): https://yourdomain.com
 * - No code changes needed when deploying!
 */

const getAPIEndpoint = () => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;

    // Development: localhost or 127.0.0.1
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Use port 3000 by default for dev
        return 'http://localhost:3000';
    }

    // Production: Use the current domain (works everywhere!)
    // This handles: Render, Heroku, custom domains, etc.
    return `${protocol}//${window.location.host}`;
};

// Export the BASE_URL that all files should use
const BASE_URL = getAPIEndpoint();

console.log(`[Config] API Endpoint: ${BASE_URL}`);
