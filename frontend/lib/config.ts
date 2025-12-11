// Centralized configuration - single source of truth for API URLs
// Change these values when deploying to different environments

export const config = {
  // Backend API URL
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030',

  // Frontend URL (for callbacks, redirects, etc.)
  frontendUrl: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
};

// Export individual values for convenience
export const API_URL = config.apiUrl;
export const FRONTEND_URL = config.frontendUrl;

export default config;

