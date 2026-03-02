/**
 * Type definitions for Cloudflare API and tunnel structures
 */

export interface Credentials {
  apiToken: string;
  accountId: string;
  accountName?: string;
  domain: string;
}

export interface Tunnel {
  id: string;
  name: string;
  created_at: string;
  deleted_at?: string;
  status: 'healthy' | 'down' | 'degraded' | 'inactive';
  connections?: Connection[];
  conns_active_at?: string;
  conns_inactive_at?: string;
  account_tag?: string;
  tun_type?: string;
  remote_config?: boolean;
}

export interface Connection {
  id: string;
  client_id: string;
  client_version?: string;
  colo_name: string;
  opened_at: string;
  origin_ip: string;
  uuid?: string;
  is_pending_reconnect?: boolean;
}

export interface DnsRecord {
  id?: string;
  type: 'CNAME' | 'A' | 'AAAA';
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
  zone_id?: string;
  zone_name?: string;
  comment?: string;
}

export interface Zone {
  id: string;
  name: string;
  status: string;
  paused?: boolean;
  type?: string;
}

export interface IngressRule {
  hostname?: string;
  service: string;
}

export interface IngressConfig {
  tunnel: string;
  credentials_file: string;
  ingress: IngressRule[];
}

export interface ServiceStatus {
  running: boolean;
  pid?: number;
}

export interface TunnelCredentials {
  AccountTag: string;
  TunnelSecret: string;
  TunnelID: string;
}

export interface CloudflareApiResponse<T> {
  success: boolean;
  errors: CloudflareApiError[];
  messages: CloudflareApiMessage[];
  result: T;
  result_info?: {
    count: number;
    page: number;
    per_page: number;
    total_count: number;
  };
}

export interface CloudflareApiError {
  code: number;
  message: string;
  documentation_url?: string;
  source?: {
    pointer: string;
  };
}

export interface CloudflareApiMessage {
  code: number;
  message: string;
  documentation_url?: string;
  source?: {
    pointer: string;
  };
}

// Zero Trust Access types

export interface AccessApplication {
  id: string;
  name: string;
  domain: string;
  type: 'self_hosted' | 'saas' | 'ssh' | 'vnc' | 'bookmark';
  session_duration?: string;
  created_at?: string;
  updated_at?: string;
  aud?: string;
}

export interface AccessPolicy {
  id: string;
  name: string;
  decision: 'allow' | 'deny' | 'bypass' | 'non_identity';
  include: AccessRule[];
  exclude?: AccessRule[];
  require?: AccessRule[];
  precedence?: number;
  created_at?: string;
  updated_at?: string;
}

// Access rule types - union of different rule kinds
export type AccessRule =
  | { email: { email: string } }
  | { email_domain: { domain: string } }
  | { everyone: Record<string, never> }
  | { ip: { ip: string } }
  | { group: { id: string } };

export interface AccessApplicationCreate {
  name: string;
  domain: string;
  type: 'self_hosted';
  session_duration?: string;
}

export interface AccessPolicyCreate {
  name: string;
  decision: 'allow' | 'deny' | 'bypass' | 'non_identity';
  include: AccessRule[];
  exclude?: AccessRule[];
  require?: AccessRule[];
}
