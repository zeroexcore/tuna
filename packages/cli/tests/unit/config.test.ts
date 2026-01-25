/**
 * Tests for config module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { interpolateEnvVars, validateConfig, generateTunnelName } from '../../src/lib/config.ts';
import type { TunaConfig } from '../../src/types/index.ts';

describe('interpolateEnvVars', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should interpolate $USER', () => {
    process.env.USER = 'alice';
    const result = interpolateEnvVars('$USER-api.example.com');
    expect(result).toBe('alice-api.example.com');
  });

  it('should interpolate $TUNA_USER with priority over $USER', () => {
    process.env.USER = 'alice';
    process.env.TUNA_USER = 'alice-dev';
    const result = interpolateEnvVars('$USER-api.example.com');
    expect(result).toBe('alice-dev-api.example.com');
  });

  it('should interpolate $TUNA_USER directly', () => {
    process.env.TUNA_USER = 'custom-user';
    const result = interpolateEnvVars('$TUNA_USER-api.example.com');
    expect(result).toBe('custom-user-api.example.com');
  });

  it('should interpolate $HOME', () => {
    process.env.HOME = '/Users/alice';
    const result = interpolateEnvVars('$HOME/.config');
    expect(result).toBe('/Users/alice/.config');
  });

  it('should fallback to "unknown" when $USER is not set', () => {
    delete process.env.USER;
    delete process.env.TUNA_USER;
    const result = interpolateEnvVars('$USER-api.example.com');
    expect(result).toBe('unknown-api.example.com');
  });

  it('should handle multiple placeholders', () => {
    process.env.USER = 'alice';
    process.env.HOME = '/Users/alice';
    const result = interpolateEnvVars('$USER-$HOME');
    expect(result).toBe('alice-/Users/alice');
  });

  it('should interpolate in middle of string', () => {
    process.env.USER = 'alice';
    const result = interpolateEnvVars('app-$USER.staging.example.com');
    expect(result).toBe('app-alice.staging.example.com');
  });
});

describe('validateConfig', () => {
  it('should pass valid config', () => {
    const config: TunaConfig = {
      forward: 'my-app.example.com',
      port: 3000,
    };
    expect(() => validateConfig(config)).not.toThrow();
  });

  it('should throw on missing forward', () => {
    const config = {
      port: 3000,
    } as TunaConfig;
    expect(() => validateConfig(config)).toThrow('Missing "forward"');
  });

  it('should throw on missing port', () => {
    const config = {
      forward: 'my-app.example.com',
    } as TunaConfig;
    expect(() => validateConfig(config)).toThrow('Missing "port"');
  });

  it('should throw on non-number port', () => {
    const config = {
      forward: 'my-app.example.com',
      port: '3000' as any,
    };
    expect(() => validateConfig(config)).toThrow('"port" must be a number');
  });

  it('should throw on port out of range (too low)', () => {
    const config: TunaConfig = {
      forward: 'my-app.example.com',
      port: 0,
    };
    expect(() => validateConfig(config)).toThrow('"port" must be between 1 and 65535');
  });

  it('should throw on port out of range (too high)', () => {
    const config: TunaConfig = {
      forward: 'my-app.example.com',
      port: 65536,
    };
    expect(() => validateConfig(config)).toThrow('"port" must be between 1 and 65535');
  });

  it('should throw on invalid domain format', () => {
    const config: TunaConfig = {
      forward: 'invalid..domain.com',
      port: 3000,
    };
    expect(() => validateConfig(config)).toThrow('Invalid domain format');
  });

  it('should throw on unresolved environment variables', () => {
    const config: TunaConfig = {
      forward: '$USER-api.example.com',
      port: 3000,
    };
    expect(() => validateConfig(config)).toThrow('Unresolved environment variables');
  });

  it('should pass with subdomain', () => {
    const config: TunaConfig = {
      forward: 'api.staging.example.com',
      port: 3000,
    };
    expect(() => validateConfig(config)).not.toThrow();
  });

  it('should pass with hyphenated domain', () => {
    const config: TunaConfig = {
      forward: 'my-app-api.example.com',
      port: 3000,
    };
    expect(() => validateConfig(config)).not.toThrow();
  });
});

describe('generateTunnelName', () => {
  it('should generate name with tuna prefix', () => {
    const result = generateTunnelName('my-app.example.com');
    expect(result).toBe('tuna-my-app-example-com');
  });

  it('should sanitize domain with dots', () => {
    const result = generateTunnelName('api.staging.example.com');
    expect(result).toBe('tuna-api-staging-example-com');
  });

  it('should lowercase everything', () => {
    const result = generateTunnelName('MyApp.Example.Com');
    expect(result).toBe('tuna-myapp-example-com');
  });

  it('should replace special characters', () => {
    const result = generateTunnelName('alice@api.example.com');
    expect(result).toBe('tuna-alice-api-example-com');
  });

  it('should handle consecutive special chars', () => {
    const result = generateTunnelName('my..app..example.com');
    expect(result).toBe('tuna-my--app--example-com');
  });

  it('should work with user-interpolated domain', () => {
    const result = generateTunnelName('alice-api.example.com');
    expect(result).toBe('tuna-alice-api-example-com');
  });
});
