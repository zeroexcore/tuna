/**
 * Service management - launchd service for persistent cloudflared tunnels
 */

import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import { execa } from 'execa';
import * as yaml from 'js-yaml';
import {
  getExecutablePath,
  getTunaDir,
  getTunnelCredentialsPath,
  getTunnelConfigPath,
  ensureDirectories,
} from './cloudflared.ts';
import type { IngressConfig, IngressRule, ServiceStatus, TunnelCredentials } from '../types/index.ts';

const LAUNCHD_LABEL = 'com.tuna.cloudflared';
const LAUNCH_AGENTS_DIR = join(homedir(), 'Library', 'LaunchAgents');
const PLIST_PATH = join(LAUNCH_AGENTS_DIR, `${LAUNCHD_LABEL}.plist`);

/**
 * Generate ingress configuration for a tunnel
 */
export function generateIngressConfig(
  tunnelId: string,
  hostname: string,
  port: number
): IngressConfig {
  const credentialsFile = getTunnelCredentialsPath(tunnelId);

  return {
    tunnel: tunnelId,
    credentials_file: credentialsFile,
    ingress: [
      {
        hostname,
        service: `http://localhost:${port}`,
      },
      {
        service: 'http_status:404',
      },
    ],
  };
}

/**
 * Write ingress configuration to YAML file
 * Note: cloudflared expects 'credentials-file' (hyphen) not 'credentials_file' (underscore)
 */
export function writeIngressConfig(tunnelId: string, config: IngressConfig): string {
  ensureDirectories();
  const configPath = getTunnelConfigPath(tunnelId);
  
  // Convert to cloudflared's expected format (hyphenated keys)
  const cloudflaredConfig = {
    tunnel: config.tunnel,
    'credentials-file': config.credentials_file,
    ingress: config.ingress,
  };
  
  const yamlContent = yaml.dump(cloudflaredConfig, {
    lineWidth: -1, // Don't wrap lines
    noRefs: true,
  });
  writeFileSync(configPath, yamlContent, { mode: 0o600 });
  return configPath;
}

/**
 * Read existing ingress configuration
 */
export function readIngressConfig(tunnelId: string): IngressConfig | null {
  const configPath = getTunnelConfigPath(tunnelId);
  if (!existsSync(configPath)) {
    return null;
  }
  const content = readFileSync(configPath, 'utf-8');
  return yaml.load(content) as IngressConfig;
}

/**
 * Add or update an ingress rule in the configuration
 */
export function updateIngressRule(
  config: IngressConfig,
  hostname: string,
  port: number
): IngressConfig {
  const newRule: IngressRule = {
    hostname,
    service: `http://localhost:${port}`,
  };

  // Find existing rule for this hostname
  const existingIndex = config.ingress.findIndex((r) => r.hostname === hostname);

  if (existingIndex >= 0) {
    // Update existing rule
    config.ingress[existingIndex] = newRule;
  } else {
    // Add new rule before the catch-all 404
    const catchAllIndex = config.ingress.findIndex((r) => !r.hostname);
    if (catchAllIndex >= 0) {
      config.ingress.splice(catchAllIndex, 0, newRule);
    } else {
      config.ingress.push(newRule);
      config.ingress.push({ service: 'http_status:404' });
    }
  }

  return config;
}

/**
 * Remove an ingress rule from the configuration
 */
export function removeIngressRule(config: IngressConfig, hostname: string): IngressConfig {
  config.ingress = config.ingress.filter((r) => r.hostname !== hostname);
  return config;
}

/**
 * Save tunnel credentials to file
 */
export function saveTunnelCredentials(
  tunnelId: string,
  accountId: string,
  tunnelSecret: string
): string {
  ensureDirectories();
  const credentialsPath = getTunnelCredentialsPath(tunnelId);

  const credentials: TunnelCredentials = {
    AccountTag: accountId,
    TunnelSecret: tunnelSecret,
    TunnelID: tunnelId,
  };

  writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2), { mode: 0o600 });
  return credentialsPath;
}

/**
 * Check if tunnel credentials exist
 */
export function tunnelCredentialsExist(tunnelId: string): boolean {
  return existsSync(getTunnelCredentialsPath(tunnelId));
}

/**
 * Delete tunnel credentials file
 */
export function deleteTunnelCredentials(tunnelId: string): boolean {
  const path = getTunnelCredentialsPath(tunnelId);
  if (existsSync(path)) {
    unlinkSync(path);
    return true;
  }
  return false;
}

/**
 * Delete tunnel config file
 */
export function deleteTunnelConfig(tunnelId: string): boolean {
  const path = getTunnelConfigPath(tunnelId);
  if (existsSync(path)) {
    unlinkSync(path);
    return true;
  }
  return false;
}

/**
 * Generate launchd plist content for the service
 */
function generatePlistContent(configPath: string): string {
  const cloudflaredPath = getExecutablePath();

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${cloudflaredPath}</string>
    <string>tunnel</string>
    <string>--config</string>
    <string>${configPath}</string>
    <string>run</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${getTunaDir()}/cloudflared.log</string>
  <key>StandardErrorPath</key>
  <string>${getTunaDir()}/cloudflared.err</string>
</dict>
</plist>`;
}

/**
 * Install cloudflared as a launchd service (macOS only)
 */
export async function installService(tunnelId: string): Promise<void> {
  if (platform() !== 'darwin') {
    throw new Error('Service installation is only supported on macOS');
  }

  const configPath = getTunnelConfigPath(tunnelId);
  if (!existsSync(configPath)) {
    throw new Error(`Tunnel config not found: ${configPath}`);
  }

  // Create LaunchAgents directory if it doesn't exist
  const { mkdirSync } = await import('fs');
  if (!existsSync(LAUNCH_AGENTS_DIR)) {
    mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });
  }

  // Write plist file
  const plistContent = generatePlistContent(configPath);
  writeFileSync(PLIST_PATH, plistContent);

  // Load the service
  await execa('launchctl', ['load', PLIST_PATH]);
}

/**
 * Uninstall the cloudflared launchd service
 */
export async function uninstallService(): Promise<void> {
  if (platform() !== 'darwin') {
    throw new Error('Service management is only supported on macOS');
  }

  if (!existsSync(PLIST_PATH)) {
    return; // Not installed
  }

  try {
    // Unload the service
    await execa('launchctl', ['unload', PLIST_PATH]);
  } catch {
    // Ignore errors if service wasn't loaded
  }

  // Remove plist file
  if (existsSync(PLIST_PATH)) {
    unlinkSync(PLIST_PATH);
  }
}

/**
 * Start the cloudflared service
 */
export async function startService(): Promise<void> {
  if (platform() !== 'darwin') {
    throw new Error('Service management is only supported on macOS');
  }

  if (!existsSync(PLIST_PATH)) {
    throw new Error('Service not installed. Run tuna first to set up the tunnel.');
  }

  // Use launchctl load which loads and starts the service (since RunAtLoad is true)
  // This works whether the service is already loaded or not
  await execa('launchctl', ['load', PLIST_PATH]);
}

/**
 * Stop the cloudflared service
 */
export async function stopService(): Promise<void> {
  if (platform() !== 'darwin') {
    throw new Error('Service management is only supported on macOS');
  }

  if (!existsSync(PLIST_PATH)) {
    return; // Not installed
  }

  try {
    // Use launchctl unload to stop and unregister the service
    // This works whether the service is running or not
    await execa('launchctl', ['unload', PLIST_PATH]);
  } catch {
    // Ignore errors if service wasn't loaded
  }
}

/**
 * Restart the cloudflared service
 */
export async function restartService(): Promise<void> {
  await stopService();
  await startService();
}

/**
 * Get the current service status
 */
export async function getServiceStatus(): Promise<ServiceStatus> {
  if (platform() !== 'darwin') {
    return { running: false };
  }

  if (!existsSync(PLIST_PATH)) {
    return { running: false };
  }

  try {
    const result = await execa('launchctl', ['list', LAUNCHD_LABEL]);
    const output = result.stdout;

    // Parse PID from output
    // Format: "PID\tStatus\tLabel"
    const match = output.match(/^(\d+)/);
    const pid = match ? parseInt(match[1], 10) : undefined;

    return {
      running: pid !== undefined && pid > 0,
      pid,
    };
  } catch {
    return { running: false };
  }
}

/**
 * Check if the service is installed
 */
export function isServiceInstalled(): boolean {
  return existsSync(PLIST_PATH);
}

/**
 * Update the service configuration (reload with new config)
 */
export async function updateServiceConfig(tunnelId: string): Promise<void> {
  const status = await getServiceStatus();

  // Update plist with new config path
  const configPath = getTunnelConfigPath(tunnelId);
  const plistContent = generatePlistContent(configPath);
  writeFileSync(PLIST_PATH, plistContent);

  if (status.running) {
    // Reload service to pick up new config
    await restartService();
  }
}
