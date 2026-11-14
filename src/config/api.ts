// Centralized API Base URL Configuration
// If VITE_API_URL is set in .env or Netlify environment variables, it uses that domain directly.
// Otherwise, it defaults to relative paths ('') which use Netlify's /api proxy rewrite in netlify.toml.

const envApiUrl = (import.meta.env.VITE_API_URL || '').trim();
export const API_BASE_URL = envApiUrl ? envApiUrl.replace(/\/+$/, '') : '';

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

