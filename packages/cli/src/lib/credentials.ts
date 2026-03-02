/**
 * Credential management - JSON files in ~/.config/tuna/
 */

import { readFile, writeFile, readdir, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { Credentials } from '../types/index.ts';

const CONFIG_DIR = join(homedir(), '.config', 'tuna', 'credentials');

async function ensureDir(): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
}

function credPath(domain: string): string {
  return join(CONFIG_DIR, `${domain}.json`);
}

export async function storeCredentials(
  domain: string,
  creds: Credentials
): Promise<void> {
  await ensureDir();
  await writeFile(credPath(domain), JSON.stringify(creds, null, 2) + '\n', {
    mode: 0o600,
  });
}

export async function getCredentials(
  domain: string
): Promise<Credentials | null> {
  try {
    const data = await readFile(credPath(domain), 'utf-8');
    return JSON.parse(data) as Credentials;
  } catch (err: any) {
    if (err.code === 'ENOENT') return null;
    throw new Error(`Failed to read credentials for ${domain}`);
  }
}

export async function deleteCredentials(domain: string): Promise<boolean> {
  try {
    await unlink(credPath(domain));
    return true;
  } catch (err: any) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

export async function listDomains(): Promise<string[]> {
  try {
    const files = await readdir(CONFIG_DIR);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''));
  } catch (err: any) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
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
