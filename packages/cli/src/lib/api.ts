/**
 * Cloudflare API client for tunnel and DNS management
 */

import type {
  Credentials,
  Tunnel,
  DnsRecord,
  Zone,
  CloudflareApiResponse,
  AccessApplication,
  AccessPolicy,
  AccessApplicationCreate,
  AccessPolicyCreate,
} from '../types/index.ts';

const BASE_URL = 'https://api.cloudflare.com/client/v4';

export class CloudflareAPI {
  private apiToken: string;
  private accountId: string;

  constructor(credentials: Credentials) {
    this.accountId = credentials.accountId;
    this.apiToken = credentials.apiToken;
  }

  /**
   * Make an authenticated request to the Cloudflare API
   */
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<CloudflareApiResponse<T>> {
    const url = `${BASE_URL}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle rate limiting with retry
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('retry-after') || '5');
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return this.request<T>(path, options);
    }

    const data = (await response.json()) as CloudflareApiResponse<T>;

    if (!response.ok) {
      this.handleApiError(response.status, data);
    }

    return data;
  }

  /**
   * Validate API token and get account info
   */
  async validateToken(): Promise<{ id: string; name: string }> {
    const verifyResponse = await this.request<{ status: string }>('/user/tokens/verify');

    if (!verifyResponse.success) {
      throw new Error('Invalid API token');
    }

    // Get account ID and name
    const accountsResponse = await this.request<Array<{ id: string; name: string }>>('/accounts');
    const accounts = accountsResponse.result;

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found for this token');
    }

    return { id: accounts[0].id, name: accounts[0].name };
  }

  /**
   * Create a new tunnel
   */
  async createTunnel(name: string, secret: string): Promise<Tunnel> {
    const response = await this.request<Tunnel>(`/accounts/${this.accountId}/cfd_tunnel`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        tunnel_secret: secret,
        config_src: 'local',
      }),
    });

    if (!response.success) {
      throw new Error(`Failed to create tunnel: ${response.errors[0]?.message}`);
    }

    return response.result;
  }

  /**
   * List all tunnels
   */
  async listTunnels(): Promise<Tunnel[]> {
    const response = await this.request<Tunnel[]>(`/accounts/${this.accountId}/cfd_tunnel`);

    if (!response.success) {
      throw new Error('Failed to list tunnels');
    }

    return response.result;
  }

  /**
   * Get tunnel details
   */
  async getTunnel(tunnelId: string): Promise<Tunnel> {
    const response = await this.request<Tunnel>(
      `/accounts/${this.accountId}/cfd_tunnel/${tunnelId}`
    );

    if (!response.success) {
      throw new Error('Tunnel not found');
    }

    return response.result;
  }

  /**
   * Delete a tunnel
   */
  async deleteTunnel(tunnelId: string): Promise<void> {
    const response = await this.request<{ id: string }>(
      `/accounts/${this.accountId}/cfd_tunnel/${tunnelId}`,
      { method: 'DELETE' }
    );

    if (!response.success) {
      throw new Error('Failed to delete tunnel');
    }
  }

  /**
   * List all zones accessible by the token
   */
  async listZones(): Promise<Zone[]> {
    const response = await this.request<Zone[]>('/zones?per_page=50&status=active');
    if (!response.success) {
      throw new Error('Failed to list zones');
    }
    return response.result;
  }

  /**
   * Get zone by domain name
   */
  async getZoneByName(domain: string): Promise<Zone> {
    const response = await this.request<Zone[]>(`/zones?name=${encodeURIComponent(domain)}`);

    if (!response.success || response.result.length === 0) {
      throw new Error(
        `Zone not found: ${domain}. Make sure the domain is added to your Cloudflare account.`
      );
    }

    return response.result[0];
  }

  /**
   * Create DNS record
   */
  async createDnsRecord(zoneId: string, record: DnsRecord): Promise<DnsRecord> {
    const response = await this.request<DnsRecord>(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify(record),
    });

    if (!response.success) {
      throw new Error('Failed to create DNS record');
    }

    return response.result;
  }

  /**
   * List DNS records
   */
  async listDnsRecords(zoneId: string, name?: string): Promise<DnsRecord[]> {
    const params = name ? `?name=${encodeURIComponent(name)}` : '';
    const response = await this.request<DnsRecord[]>(`/zones/${zoneId}/dns_records${params}`);

    if (!response.success) {
      throw new Error('Failed to list DNS records');
    }

    return response.result;
  }

  /**
   * Update DNS record
   */
  async updateDnsRecord(zoneId: string, recordId: string, record: DnsRecord): Promise<DnsRecord> {
    const response = await this.request<DnsRecord>(`/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(record),
    });

    if (!response.success) {
      throw new Error('Failed to update DNS record');
    }

    return response.result;
  }

  /**
   * Delete DNS record
   */
  async deleteDnsRecord(zoneId: string, recordId: string): Promise<void> {
    const response = await this.request<{ id: string }>(
      `/zones/${zoneId}/dns_records/${recordId}`,
      { method: 'DELETE' }
    );

    if (!response.success) {
      throw new Error('Failed to delete DNS record');
    }
  }

  // ============================================
  // Zero Trust Access API Methods
  // ============================================

  /**
   * List Access applications
   */
  async listAccessApplications(): Promise<AccessApplication[]> {
    const response = await this.request<AccessApplication[]>(
      `/accounts/${this.accountId}/access/apps`
    );

    if (!response.success) {
      throw new Error('Failed to list Access applications');
    }

    return response.result;
  }

  /**
   * Get Access application by domain
   */
  async getAccessApplicationByDomain(domain: string): Promise<AccessApplication | null> {
    const apps = await this.listAccessApplications();
    return apps.find((app) => app.domain === domain) || null;
  }

  /**
   * Create Access application
   */
  async createAccessApplication(app: AccessApplicationCreate): Promise<AccessApplication> {
    const response = await this.request<AccessApplication>(
      `/accounts/${this.accountId}/access/apps`,
      {
        method: 'POST',
        body: JSON.stringify(app),
      }
    );

    if (!response.success) {
      throw new Error(`Failed to create Access application: ${response.errors[0]?.message}`);
    }

    return response.result;
  }

  /**
   * Delete Access application
   */
  async deleteAccessApplication(appId: string): Promise<void> {
    const response = await this.request<{ id: string }>(
      `/accounts/${this.accountId}/access/apps/${appId}`,
      { method: 'DELETE' }
    );

    if (!response.success) {
      throw new Error('Failed to delete Access application');
    }
  }

  /**
   * List policies for an Access application
   */
  async listAccessPolicies(appId: string): Promise<AccessPolicy[]> {
    const response = await this.request<AccessPolicy[]>(
      `/accounts/${this.accountId}/access/apps/${appId}/policies`
    );

    if (!response.success) {
      throw new Error('Failed to list Access policies');
    }

    return response.result;
  }

  /**
   * Create Access policy for an application
   */
  async createAccessPolicy(appId: string, policy: AccessPolicyCreate): Promise<AccessPolicy> {
    const response = await this.request<AccessPolicy>(
      `/accounts/${this.accountId}/access/apps/${appId}/policies`,
      {
        method: 'POST',
        body: JSON.stringify(policy),
      }
    );

    if (!response.success) {
      throw new Error(`Failed to create Access policy: ${response.errors[0]?.message}`);
    }

    return response.result;
  }

  /**
   * Update Access policy
   */
  async updateAccessPolicy(
    appId: string,
    policyId: string,
    policy: AccessPolicyCreate
  ): Promise<AccessPolicy> {
    const response = await this.request<AccessPolicy>(
      `/accounts/${this.accountId}/access/apps/${appId}/policies/${policyId}`,
      {
        method: 'PUT',
        body: JSON.stringify(policy),
      }
    );

    if (!response.success) {
      throw new Error(`Failed to update Access policy: ${response.errors[0]?.message}`);
    }

    return response.result;
  }

  /**
   * Delete Access policy
   */
  async deleteAccessPolicy(appId: string, policyId: string): Promise<void> {
    const response = await this.request<{ id: string }>(
      `/accounts/${this.accountId}/access/apps/${appId}/policies/${policyId}`,
      { method: 'DELETE' }
    );

    if (!response.success) {
      throw new Error('Failed to delete Access policy');
    }
  }

  /**
   * Handle API errors with user-friendly messages
   */
  private handleApiError(status: number, data: CloudflareApiResponse<unknown>): never {
    if (status === 401) {
      throw new Error('Invalid API token. Run: tuna --login');
    }

    if (status === 403) {
      throw new Error(
        'Insufficient permissions. Your API token needs:\n' +
          '  - Account → Cloudflare Tunnel → Edit\n' +
          '  - Account → Access: Apps and Policies → Edit\n' +
          '  - Zone → DNS → Edit\n' +
          '  - Account → Account Settings → Read'
      );
    }

    if (status === 404) {
      throw new Error('Resource not found. Check tunnel ID or domain.');
    }

    if (status === 429) {
      throw new Error('Rate limited. Please wait a moment and try again.');
    }

    if (data?.errors?.[0]) {
      throw new Error(`Cloudflare API error: ${data.errors[0].message}`);
    }

    throw new Error(`API request failed with status ${status}`);
  }
}
