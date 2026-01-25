/**
 * Cloudflared binary management - detection, download, and execution
 */

import { execa, type ExecaError } from 'execa';
import { existsSync, mkdirSync, chmodSync, createWriteStream } from 'fs';
import { homedir, platform, arch } from 'os';
import { join } from 'path';

const TUNA_DIR = join(homedir(), '.tuna');
const BIN_DIR = join(TUNA_DIR, 'bin');
const TUNNELS_DIR = join(TUNA_DIR, 'tunnels');

// GitHub release download URLs
const DOWNLOAD_BASE = 'https://github.com/cloudflare/cloudflared/releases/latest/download';

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Get the download URL for cloudflared based on platform and architecture
 */
function getDownloadUrl(): string {
  const os = platform();
  const architecture = arch();

  if (os === 'darwin') {
    if (architecture === 'arm64') {
      return `${DOWNLOAD_BASE}/cloudflared-darwin-arm64.tgz`;
    }
    return `${DOWNLOAD_BASE}/cloudflared-darwin-amd64.tgz`;
  }

  if (os === 'linux') {
    if (architecture === 'arm64') {
      return `${DOWNLOAD_BASE}/cloudflared-linux-arm64`;
    }
    if (architecture === 'arm') {
      return `${DOWNLOAD_BASE}/cloudflared-linux-arm`;
    }
    return `${DOWNLOAD_BASE}/cloudflared-linux-amd64`;
  }

  if (os === 'win32') {
    if (architecture === 'x64') {
      return `${DOWNLOAD_BASE}/cloudflared-windows-amd64.exe`;
    }
    return `${DOWNLOAD_BASE}/cloudflared-windows-386.exe`;
  }

  throw new Error(`Unsupported platform: ${os} ${architecture}`);
}

/**
 * Get the path to the cloudflared binary (either in PATH or downloaded)
 */
export function getExecutablePath(): string {
  // First check if cloudflared is in PATH
  const systemPath = getSystemCloudflaredPath();
  if (systemPath) {
    return systemPath;
  }

  // Fall back to downloaded binary
  const os = platform();
  const binaryName = os === 'win32' ? 'cloudflared.exe' : 'cloudflared';
  return join(BIN_DIR, binaryName);
}

/**
 * Check if cloudflared is available in system PATH
 */
function getSystemCloudflaredPath(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require('child_process') as typeof import('child_process');
    const stdout = execSync('which cloudflared 2>/dev/null || where cloudflared 2>nul', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const path = stdout.trim().split('\n')[0];
    return path || null;
  } catch {
    return null;
  }
}

/**
 * Check if cloudflared is installed (either in PATH or downloaded)
 */
export function isInstalled(): boolean {
  // Check system PATH first
  if (getSystemCloudflaredPath()) {
    return true;
  }

  // Check downloaded binary
  const binaryPath = getExecutablePath();
  return existsSync(binaryPath);
}

/**
 * Get the installed cloudflared version
 */
export async function getVersion(): Promise<string> {
  const result = await exec(['--version']);
  // Output format: "cloudflared version 2024.1.0 (built 2024-01-15-1234 revision abcd1234)"
  const match = result.stdout.match(/version\s+(\d+\.\d+\.\d+)/);
  if (match) {
    return match[1];
  }
  throw new Error('Could not parse cloudflared version');
}

/**
 * Ensure the tuna directories exist
 */
export function ensureDirectories(): void {
  if (!existsSync(TUNA_DIR)) {
    mkdirSync(TUNA_DIR, { recursive: true });
  }
  if (!existsSync(BIN_DIR)) {
    mkdirSync(BIN_DIR, { recursive: true });
  }
  if (!existsSync(TUNNELS_DIR)) {
    mkdirSync(TUNNELS_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Download cloudflared binary for the current platform
 */
export async function download(
  onProgress?: (percent: number) => void
): Promise<string> {
  ensureDirectories();

  const url = getDownloadUrl();
  const isTarball = url.endsWith('.tgz');
  const binaryPath = getExecutablePath();

  // Download the file
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download cloudflared: ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
  let downloadedSize = 0;

  if (isTarball) {
    // For macOS, we need to extract from tarball
    const tempTarPath = join(BIN_DIR, 'cloudflared.tgz');
    const writeStream = createWriteStream(tempTarPath);

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response body reader');
    }

    // Download with progress
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      writeStream.write(Buffer.from(value));
      downloadedSize += value.length;

      if (onProgress && totalSize > 0) {
        onProgress(Math.round((downloadedSize / totalSize) * 100));
      }
    }

    writeStream.end();
    await new Promise((resolve) => writeStream.on('finish', resolve));

    // Extract tarball using tar command
    await execa('tar', ['-xzf', tempTarPath, '-C', BIN_DIR]);

    // Remove tarball
    const { unlinkSync } = await import('fs');
    unlinkSync(tempTarPath);
  } else {
    // Direct binary download (Linux, Windows)
    const writeStream = createWriteStream(binaryPath);
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response body reader');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      writeStream.write(Buffer.from(value));
      downloadedSize += value.length;

      if (onProgress && totalSize > 0) {
        onProgress(Math.round((downloadedSize / totalSize) * 100));
      }
    }

    writeStream.end();
    await new Promise((resolve) => writeStream.on('finish', resolve));
  }

  // Make executable on Unix
  if (platform() !== 'win32') {
    chmodSync(binaryPath, 0o755);
  }

  return binaryPath;
}

/**
 * Execute a cloudflared command
 */
export async function exec(args: string[]): Promise<ExecResult> {
  const binaryPath = getExecutablePath();

  if (!existsSync(binaryPath) && !getSystemCloudflaredPath()) {
    throw new Error(
      'cloudflared is not installed. Run `tuna` to auto-download, or install manually:\n' +
      '  brew install cloudflared\n' +
      '  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/'
    );
  }

  try {
    const result = await execa(binaryPath, args);
    return {
      stdout: String(result.stdout ?? ''),
      stderr: String(result.stderr ?? ''),
      exitCode: result.exitCode ?? 0,
    };
  } catch (error) {
    const execaError = error as ExecaError;
    if (execaError.exitCode !== undefined) {
      return {
        stdout: String(execaError.stdout ?? ''),
        stderr: String(execaError.stderr ?? ''),
        exitCode: execaError.exitCode,
      };
    }
    throw error;
  }
}

/**
 * Get the tuna directory path
 */
export function getTunaDir(): string {
  return TUNA_DIR;
}

/**
 * Get the tunnels directory path
 */
export function getTunnelsDir(): string {
  return TUNNELS_DIR;
}

/**
 * Get path for a tunnel credentials file
 */
export function getTunnelCredentialsPath(tunnelId: string): string {
  return join(TUNNELS_DIR, `${tunnelId}.json`);
}

/**
 * Get path for a tunnel config file
 */
export function getTunnelConfigPath(tunnelId: string): string {
  return join(TUNA_DIR, `config-${tunnelId}.yml`);
}
