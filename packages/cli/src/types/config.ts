/**
 * Type definitions for Tuna configuration
 */

/**
 * Access control configuration for Zero Trust
 * Array of emails and/or email domains:
 *   - Strings starting with @ are email domains: "@company.com"
 *   - Other strings are specific emails: "alice@gmail.com"
 * Example: ["@company.com", "bob@contractor.io"]
 */
export type AccessConfig = string[];

export interface TunaConfig {
  forward: string;  // Domain to expose (e.g., my-app.example.com or $USER-app.example.com)
  port: number;     // Local port to forward to
  access?: AccessConfig; // Optional Zero Trust access control
}

export interface PackageJson {
  name?: string;
  version?: string;
  tuna?: TunaConfig;
  [key: string]: unknown;
}

/**
 * Parsed access config - separated into emails and domains
 */
export interface ParsedAccessConfig {
  emails: string[];      // ["alice@gmail.com", "bob@contractor.io"]
  emailDomains: string[]; // ["company.com"] (without @)
}
