/**
 * Configuration management - reads package.json and interpolates environment variables
 */

import { findUp } from 'find-up';
import { readFile } from 'fs/promises';
import type { PackageJson, TunaConfig } from '../types/index.ts';

/**
 * Find package.json in current directory or parent directories
 */
export async function findPackageJson(): Promise<string | null> {
  const found = await findUp('package.json');
  return found || null;
}

/**
 * Interpolate environment variables in a string
 * Priority: $TUNA_USER > $USER > 'unknown'
 */
export function interpolateEnvVars(value: string): string {
  const tunaUser = process.env.TUNA_USER;
  const user = process.env.USER;
  const home = process.env.HOME;
  
  let result = value;
  
  // Replace $TUNA_USER first (if set)
  if (tunaUser) {
    result = result.replace(/\$TUNA_USER/g, tunaUser);
  }
  
  // Replace $USER with TUNA_USER if set, otherwise USER, otherwise 'unknown'
  result = result.replace(/\$USER/g, tunaUser || user || 'unknown');
  
  // Replace $HOME
  result = result.replace(/\$HOME/g, home || '~');
  
  return result;
}

/**
 * Validate tuna configuration
 */
export function validateConfig(config: TunaConfig): void {
  if (!config.forward) {
    throw new Error('Missing "forward" in tuna config');
  }

  if (config.port === undefined || config.port === null) {
    throw new Error('Missing "port" in tuna config');
  }

  if (typeof config.port !== 'number') {
    throw new Error('"port" must be a number');
  }

  if (config.port < 1 || config.port > 65535) {
    throw new Error('"port" must be between 1 and 65535');
  }

  // Ensure no unresolved variables remain (check this before domain validation)
  if (config.forward.includes('$')) {
    throw new Error(
      `Unresolved environment variables in forward field: ${config.forward}\n` +
      'Supported: $USER, $TUNA_USER, $HOME'
    );
  }

  // Basic domain validation (after interpolation)
  // Allow dots but not consecutive dots
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;
  if (!domainRegex.test(config.forward)) {
    throw new Error(`Invalid domain format: ${config.forward}`);
  }
}

/**
 * Read and parse tuna configuration from package.json
 */
export async function readConfig(): Promise<TunaConfig> {
  const pkgPath = await findPackageJson();

  if (!pkgPath) {
    throw new Error(
      'No package.json found.\n' +
      'Run this command from your project directory.'
    );
  }

  const content = await readFile(pkgPath, 'utf-8');
  const pkg: PackageJson = JSON.parse(content);

  if (!pkg.tuna) {
    throw new Error(
      'No "tuna" config in package.json.\n' +
      'Add to package.json:\n' +
      '{\n' +
      '  "tuna": {\n' +
      '    "forward": "my-app.example.com",\n' +
      '    "port": 3000\n' +
      '  }\n' +
      '}'
    );
  }

  // Interpolate environment variables in forward field
  const interpolatedConfig: TunaConfig = {
    ...pkg.tuna,
    forward: interpolateEnvVars(pkg.tuna.forward),
  };

  validateConfig(interpolatedConfig);
  return interpolatedConfig;
}

/**
 * Generate tunnel name from forward domain
 * Format: tuna-{sanitized-forward}
 */
export function generateTunnelName(forward: string): string {
  // Sanitize: replace non-alphanumeric with -, lowercase
  const sanitized = forward.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  return `tuna-${sanitized}`;
}
