import { Platform } from 'react-native';

const stripTrailingSlashes = (url) => url.replace(/\/+$/, '');

/**
 * Normalizes a server base URL.
 * - Strips trailing slashes
 * - If it ends with /api, removes it
 */
export const normalizeServerBaseUrl = (maybeUrl) => {
  if (!maybeUrl) return maybeUrl;
  let url = stripTrailingSlashes(maybeUrl);
  if (url.endsWith('/api')) {
    url = url.slice(0, -4);
  }
  return url;
};

export const getDefaultServerBaseUrl = () => {
  // On some Windows setups, "localhost" resolves to IPv6 (::1) while the backend
  // listens only on IPv4, causing ECONNREFUSED. Default to 127.0.0.1 for reliability.
  if (Platform.OS === 'web') return 'http://127.0.0.1:5000';
  if (Platform.OS === 'android') return 'http://10.0.2.2:5000';
  return 'http://127.0.0.1:5000';
};

/**
 * Base server URL without /api suffix.
 * Accepts EXPO_PUBLIC_API_URL as either:
 * - http://host:5000
 * - http://host:5000/api
 */
export const getServerBaseUrl = () => {
  return normalizeServerBaseUrl(process.env.EXPO_PUBLIC_API_URL) || getDefaultServerBaseUrl();
};

/**
 * API base URL WITH /api suffix.
 */
export const getApiBaseUrl = () => {
  return `${getServerBaseUrl()}/api`;
};

/**
 * Socket base URL (no /api).
 * Accepts EXPO_PUBLIC_SOCKET_URL as either:
 * - http://host:5000
 * - http://host:5000/api (will be normalized)
 */
export const getSocketBaseUrl = () => {
  const explicit = process.env.EXPO_PUBLIC_SOCKET_URL;
  if (explicit) return normalizeServerBaseUrl(explicit);
  return getServerBaseUrl();
};
