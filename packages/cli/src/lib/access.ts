/**
 * Zero Trust Access management - handles Access applications and policies
 * Uses snapshot-based diffing to sync config with Cloudflare
 */

import { CloudflareAPI } from './api.ts';
import type {
  Credentials,
  AccessConfig,
  ParsedAccessConfig,
  AccessRule,
  AccessPolicyCreate,
} from '../types/index.ts';

const TUNA_POLICY_NAME = 'tuna-access-policy';

/**
 * Parse access config array into emails and domains
 * - Strings starting with @ are email domains
 * - Other strings are specific emails
 */
export function parseAccessConfig(access: AccessConfig): ParsedAccessConfig {
  const emails: string[] = [];
  const emailDomains: string[] = [];

  for (const entry of access) {
    if (entry.startsWith('@')) {
      // Email domain - remove the @ prefix
      emailDomains.push(entry.slice(1));
    } else {
      // Specific email
      emails.push(entry);
    }
  }

  return { emails, emailDomains };
}

/**
 * Build Access rules from parsed config
 */
function buildAccessRules(parsed: ParsedAccessConfig): AccessRule[] {
  const rules: AccessRule[] = [];

  // Add email rules
  for (const email of parsed.emails) {
    rules.push({ email: { email } });
  }

  // Add email domain rules
  for (const domain of parsed.emailDomains) {
    rules.push({ email_domain: { domain } });
  }

  return rules;
}

/**
 * Compare two access rule sets to check if they're equivalent
 */
function accessRulesEqual(a: AccessRule[], b: AccessRule[]): boolean {
  if (a.length !== b.length) return false;

  // Normalize and sort for comparison
  const normalize = (rules: AccessRule[]): string[] => {
    return rules.map((rule) => {
      if ('email' in rule) return `email:${rule.email.email}`;
      if ('email_domain' in rule) return `domain:${rule.email_domain.domain}`;
      return JSON.stringify(rule);
    }).sort();
  };

  const aNorm = normalize(a);
  const bNorm = normalize(b);

  return aNorm.every((val, i) => val === bNorm[i]);
}

/**
 * Ensure Access application and policy exist and are in sync with config
 * Returns the app ID if access is configured, null otherwise
 */
export async function ensureAccess(
  credentials: Credentials,
  hostname: string,
  access: AccessConfig | undefined
): Promise<string | null> {
  const api = new CloudflareAPI(credentials);

  // Check if there's an existing Access app for this hostname
  const existingApp = await api.getAccessApplicationByDomain(hostname);

  // No access config - remove any existing Access app
  if (!access || access.length === 0) {
    if (existingApp) {
      await api.deleteAccessApplication(existingApp.id);
    }
    return null;
  }

  // Parse the access config
  const parsed = parseAccessConfig(access);
  const desiredRules = buildAccessRules(parsed);

  if (desiredRules.length === 0) {
    // No valid rules - remove existing if any
    if (existingApp) {
      await api.deleteAccessApplication(existingApp.id);
    }
    return null;
  }

  // Create or get the Access application
  let appId: string;

  if (existingApp) {
    appId = existingApp.id;
  } else {
    // Create new Access application
    const app = await api.createAccessApplication({
      name: `tuna-${hostname}`,
      domain: hostname,
      type: 'self_hosted',
      session_duration: '24h',
    });
    appId = app.id;
  }

  // Now sync the policy
  const existingPolicies = await api.listAccessPolicies(appId);
  const tunaPolicy = existingPolicies.find((p) => p.name === TUNA_POLICY_NAME);

  const desiredPolicy: AccessPolicyCreate = {
    name: TUNA_POLICY_NAME,
    decision: 'allow',
    include: desiredRules,
  };

  if (tunaPolicy) {
    // Check if policy needs updating
    if (!accessRulesEqual(tunaPolicy.include, desiredRules)) {
      await api.updateAccessPolicy(appId, tunaPolicy.id, desiredPolicy);
    }
    // else: policy is already in sync, no action needed
  } else {
    // Create new policy
    await api.createAccessPolicy(appId, desiredPolicy);
  }

  return appId;
}

/**
 * Remove Access application for a hostname
 */
export async function removeAccess(
  credentials: Credentials,
  hostname: string
): Promise<boolean> {
  const api = new CloudflareAPI(credentials);

  const existingApp = await api.getAccessApplicationByDomain(hostname);
  if (existingApp) {
    await api.deleteAccessApplication(existingApp.id);
    return true;
  }

  return false;
}

/**
 * Get access rules description for display
 */
export function getAccessDescription(access: AccessConfig): string {
  const parsed = parseAccessConfig(access);
  const parts: string[] = [];

  if (parsed.emailDomains.length > 0) {
    parts.push(...parsed.emailDomains.map((d) => `@${d}`));
  }

  if (parsed.emails.length > 0) {
    if (parsed.emails.length <= 3) {
      parts.push(...parsed.emails);
    } else {
      parts.push(`${parsed.emails.length} emails`);
    }
  }

  return parts.join(', ');
}
