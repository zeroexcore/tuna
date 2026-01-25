/**
 * DNS management - higher-level DNS operations built on top of API client
 */

import { CloudflareAPI } from './api.ts';
import { getRootDomain } from './credentials.ts';
import type { Credentials } from '../types/index.ts';

/**
 * Get the CNAME target for a tunnel
 * Format: {tunnel-id}.cfargotunnel.com
 */
export function getTunnelCnameTarget(tunnelId: string): string {
  return `${tunnelId}.cfargotunnel.com`;
}

/**
 * Ensure a DNS CNAME record exists pointing to the tunnel
 * Creates the record if it doesn't exist, updates if it points to wrong target
 */
export async function ensureDnsRecord(
  credentials: Credentials,
  forward: string,
  tunnelId: string
): Promise<void> {
  const api = new CloudflareAPI(credentials);
  const rootDomain = getRootDomain(forward);
  const cnameTarget = getTunnelCnameTarget(tunnelId);

  // Get the zone
  const zone = await api.getZoneByName(rootDomain);

  // Check if record already exists
  const existingRecords = await api.listDnsRecords(zone.id, forward);
  const existingCname = existingRecords.find(
    (r) => r.type === 'CNAME' && r.name === forward
  );

  if (existingCname) {
    // Record exists - check if it points to correct target
    if (existingCname.content === cnameTarget) {
      // Already correct, nothing to do
      return;
    }

    // Update to point to correct target
    await api.updateDnsRecord(zone.id, existingCname.id!, {
      type: 'CNAME',
      name: forward,
      content: cnameTarget,
      proxied: true,
      ttl: 1, // Auto
    });
    return;
  }

  // Check for conflicting A/AAAA records
  const conflictingRecords = existingRecords.filter(
    (r) => (r.type === 'A' || r.type === 'AAAA') && r.name === forward
  );

  if (conflictingRecords.length > 0) {
    throw new Error(
      `DNS conflict: ${forward} already has ${conflictingRecords[0].type} record(s).\n` +
      `Delete them first or use a different subdomain.`
    );
  }

  // Create new CNAME record
  await api.createDnsRecord(zone.id, {
    type: 'CNAME',
    name: forward,
    content: cnameTarget,
    proxied: true,
    ttl: 1, // Auto
  });
}

/**
 * Delete the DNS record for a domain
 */
export async function deleteDnsRecordForDomain(
  credentials: Credentials,
  forward: string
): Promise<boolean> {
  const api = new CloudflareAPI(credentials);
  const rootDomain = getRootDomain(forward);

  try {
    const zone = await api.getZoneByName(rootDomain);
    const records = await api.listDnsRecords(zone.id, forward);

    // Find and delete CNAME record for this domain
    const cnameRecord = records.find(
      (r) => r.type === 'CNAME' && r.name === forward
    );

    if (cnameRecord && cnameRecord.id) {
      await api.deleteDnsRecord(zone.id, cnameRecord.id);
      return true;
    }

    return false;
  } catch (error) {
    // If zone not found, record doesn't exist
    if ((error as Error).message.includes('Zone not found')) {
      return false;
    }
    throw error;
  }
}

/**
 * List all DNS records pointing to a specific tunnel
 */
export async function listDnsRecordsForTunnel(
  credentials: Credentials,
  tunnelId: string,
  domain: string
): Promise<string[]> {
  const api = new CloudflareAPI(credentials);
  const cnameTarget = getTunnelCnameTarget(tunnelId);

  try {
    const zone = await api.getZoneByName(domain);
    const allRecords = await api.listDnsRecords(zone.id);

    // Find all CNAME records pointing to this tunnel
    return allRecords
      .filter((r) => r.type === 'CNAME' && r.content === cnameTarget)
      .map((r) => r.name);
  } catch (error) {
    // If zone not found, return empty list
    if ((error as Error).message.includes('Zone not found')) {
      return [];
    }
    throw error;
  }
}

/**
 * Validate that the domain is properly configured
 * Returns true if DNS record exists and points to the tunnel
 */
export async function validateDnsRecord(
  credentials: Credentials,
  forward: string,
  tunnelId: string
): Promise<boolean> {
  const api = new CloudflareAPI(credentials);
  const rootDomain = getRootDomain(forward);
  const cnameTarget = getTunnelCnameTarget(tunnelId);

  try {
    const zone = await api.getZoneByName(rootDomain);
    const records = await api.listDnsRecords(zone.id, forward);

    return records.some(
      (r) => r.type === 'CNAME' && r.name === forward && r.content === cnameTarget
    );
  } catch {
    return false;
  }
}
