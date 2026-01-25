/**
 * Credential management - secure storage in macOS Keychain
 */

import keytar from 'keytar';
import type { Credentials } from '../types/index.ts';

// Use a single service name so findCredentials works correctly
const SERVICE_NAME = 'tuna';

/**
 * Store credentials in macOS Keychain
 */
export async function storeCredentials(
  domain: string,
  creds: Credentials
): Promise<void> {
  const password = JSON.stringify(creds);
  await keytar.setPassword(SERVICE_NAME, domain, password);
}

/**
 * Retrieve credentials from macOS Keychain
 * Triggers biometric authentication
 */
export async function getCredentials(
  domain: string
): Promise<Credentials | null> {
  const password = await keytar.getPassword(SERVICE_NAME, domain);

  if (!password) {
    return null;
  }

  try {
    return JSON.parse(password) as Credentials;
  } catch {
    throw new Error(`Failed to parse credentials for ${domain}`);
  }
}

/**
 * Delete credentials from macOS Keychain
 */
export async function deleteCredentials(domain: string): Promise<boolean> {
  return await keytar.deletePassword(SERVICE_NAME, domain);
}

/**
 * List all configured domains
 */
export async function listDomains(): Promise<string[]> {
  const credentials = await keytar.findCredentials(SERVICE_NAME);
  return credentials.map((c) => c.account);
}

/**
 * Extract root domain from subdomain
 * e.g., "my-app.example.com" → "example.com"
 */
export function getRootDomain(forward: string): string {
  const parts = forward.split('.');
  if (parts.length < 2) {
    throw new Error(`Invalid domain: ${forward}`);
  }
  return parts.slice(-2).join('.');
}
