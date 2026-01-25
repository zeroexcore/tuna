# Cloudflare API Reference

## Overview

Tuna interacts with the Cloudflare API to manage tunnels and DNS records. This document details the specific API endpoints used.

## Base URL

```
https://api.cloudflare.com/client/v4
```

## Authentication

All requests require Bearer token authentication:

```http
Authorization: Bearer {api_token}
```

## Required API Token Permissions

Create a token at: https://dash.cloudflare.com/profile/api-tokens

**Permissions needed:**
- Account → Cloudflare Tunnel → Edit
- Account → Access: Apps and Policies → Edit
- Zone → DNS → Edit
- Account → Account Settings → Read

---

## Tunnel Operations

### Create Tunnel

**Endpoint:** `POST /accounts/{account_id}/cfd_tunnel`

**Request:**
```json
{
  "name": "tuna-my-app-example-com",
  "tunnel_secret": "base64_encoded_32_byte_secret",
  "config_src": "local"
}
```

**Response:**
```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": {
    "id": "c1744f8b-faa1-48a4-9e5c-02ac921467fa",
    "account_tag": "699d98642c564d2e855e9661899b7252",
    "created_at": "2026-01-23T18:22:34.317854Z",
    "deleted_at": null,
    "name": "tuna-my-app-example-com",
    "connections": [],
    "conns_active_at": null,
    "conns_inactive_at": null,
    "tun_type": "cfd_tunnel",
    "status": "inactive",
    "remote_config": false
  }
}
```

**Tunnel Secret Generation:**
```typescript
import { randomBytes } from 'crypto';

function generateTunnelSecret(): string {
  return randomBytes(32).toString('base64');
}
```

### List Tunnels

**Endpoint:** `GET /accounts/{account_id}/cfd_tunnel`

**Query Parameters:**
- `per_page` (optional): Number of results per page (default: 20)
- `page` (optional): Page number (default: 1)
- `name` (optional): Filter by name

**Response:**
```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": [
    {
      "id": "c1744f8b-faa1-48a4-9e5c-02ac921467fa",
      "name": "tuna-my-app-example-com",
      "created_at": "2026-01-23T18:22:34.317854Z",
      "status": "healthy",
      "connections": [
        {
          "id": "1bedc50d-42b3-473c-b108-ff3d10c0d925",
          "colo_name": "SFO",
          "opened_at": "2026-01-23T18:25:00.000000Z"
        }
      ]
    }
  ],
  "result_info": {
    "page": 1,
    "per_page": 20,
    "count": 1,
    "total_count": 1
  }
}
```

**Tunnel Status:**
- `healthy` - Active with connections
- `inactive` - Exists but not running
- `down` - Running but no connections
- `degraded` - Partial connectivity

### Get Tunnel Details

**Endpoint:** `GET /accounts/{account_id}/cfd_tunnel/{tunnel_id}`

**Response:** Same format as single tunnel in list response.

### Delete Tunnel

**Endpoint:** `DELETE /accounts/{account_id}/cfd_tunnel/{tunnel_id}`

**Response:**
```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": {
    "id": "c1744f8b-faa1-48a4-9e5c-02ac921467fa"
  }
}
```

**Note:** Must stop cloudflared service before deleting.

---

## DNS Operations

### Get Zone by Name

**Endpoint:** `GET /zones?name={domain}`

**Example:** `GET /zones?name=example.com`

**Response:**
```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": [
    {
      "id": "023e105f4ecef8ad9ca31a8372d0c353",
      "name": "example.com",
      "status": "active",
      "paused": false,
      "type": "full",
      "development_mode": 0
    }
  ]
}
```

### Create DNS Record

**Endpoint:** `POST /zones/{zone_id}/dns_records`

**Request:**
```json
{
  "type": "CNAME",
  "name": "my-app",
  "content": "c1744f8b-faa1-48a4-9e5c-02ac921467fa.cfargotunnel.com",
  "proxied": true,
  "ttl": 1,
  "comment": "Managed by tuna"
}
```

**Response:**
```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": {
    "id": "372e67954025e0ba6aaa6d586b9e0b59",
    "zone_id": "023e105f4ecef8ad9ca31a8372d0c353",
    "zone_name": "example.com",
    "name": "my-app.example.com",
    "type": "CNAME",
    "content": "c1744f8b-faa1-48a4-9e5c-02ac921467fa.cfargotunnel.com",
    "proxiable": true,
    "proxied": true,
    "ttl": 1,
    "created_on": "2026-01-23T18:22:34.000000Z",
    "modified_on": "2026-01-23T18:22:34.000000Z"
  }
}
```

**CNAME Format:** `{tunnel_id}.cfargotunnel.com`

**TTL:**
- `1` = Auto (recommended for proxied records)
- Other values for non-proxied records

**Proxied:**
- `true` - Traffic goes through Cloudflare (recommended)
- `false` - Direct to origin

### List DNS Records

**Endpoint:** `GET /zones/{zone_id}/dns_records`

**Query Parameters:**
- `type` (optional): Filter by type (e.g., "CNAME")
- `name` (optional): Filter by name (e.g., "my-app.example.com")
- `content` (optional): Filter by content
- `per_page` (optional): Results per page
- `page` (optional): Page number

**Response:**
```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": [
    {
      "id": "372e67954025e0ba6aaa6d586b9e0b59",
      "type": "CNAME",
      "name": "my-app.example.com",
      "content": "c1744f8b-faa1-48a4-9e5c-02ac921467fa.cfargotunnel.com",
      "proxied": true,
      "ttl": 1
    }
  ]
}
```

### Update DNS Record

**Endpoint:** `PUT /zones/{zone_id}/dns_records/{record_id}`

**Request:** Same format as create.

**Response:** Same format as create.

### Delete DNS Record

**Endpoint:** `DELETE /zones/{zone_id}/dns_records/{record_id}`

**Response:**
```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": {
    "id": "372e67954025e0ba6aaa6d586b9e0b59"
  }
}
```

---

## Account Operations

### Get Account ID

**Endpoint:** `GET /accounts`

**Response:**
```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": [
    {
      "id": "699d98642c564d2e855e9661899b7252",
      "name": "My Account",
      "type": "standard"
    }
  ]
}
```

**Note:** Most users have one account. Use first account's ID.

### Verify Token

**Endpoint:** `GET /user/tokens/verify`

**Response:**
```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": {
    "id": "ed17574386854bf78a67040be0a770b0",
    "status": "active",
    "not_before": "2026-01-01T00:00:00Z",
    "expires_on": "2027-01-01T00:00:00Z"
  }
}
```

**Use case:** Validate token during `tuna --login`

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "errors": [
    {
      "code": 7003,
      "message": "Could not route to /zones/foo, perhaps your object identifier is invalid?"
    }
  ],
  "messages": [],
  "result": null
}
```

### Common Error Codes

| Code | Meaning | Recovery |
|------|---------|----------|
| 1000 | Internal error | Retry |
| 6003 | Invalid request | Fix request |
| 7003 | Invalid identifier | Check IDs |
| 9103 | Unauthorized | Check token |
| 10000 | Authentication error | Re-login |

### HTTP Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Process result |
| 400 | Bad request | Validate input |
| 401 | Unauthorized | Token invalid |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not found | Resource doesn't exist |
| 429 | Rate limited | Retry with backoff |
| 500 | Server error | Retry |

### Rate Limiting

**Limits:**
- Tunnel API: ~1200 requests/5 min
- DNS API: ~1200 requests/5 min

**Headers:**
```
X-RateLimit-Limit: 1200
X-RateLimit-Remaining: 1150
X-RateLimit-Reset: 1642723200
```

**Retry Strategy:**
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Tunnel Configuration File

### Credentials File Format

**Location:** `~/.tuna/tunnels/{tunnel_id}.json`

**Content:**
```json
{
  "AccountTag": "699d98642c564d2e855e9661899b7252",
  "TunnelSecret": "base64_encoded_32_byte_secret",
  "TunnelID": "c1744f8b-faa1-48a4-9e5c-02ac921467fa"
}
```

**Generation:**
```typescript
interface TunnelCredentials {
  AccountTag: string;
  TunnelSecret: string;
  TunnelID: string;
}

function generateCredentialsFile(
  accountId: string,
  tunnelId: string,
  secret: string
): TunnelCredentials {
  return {
    AccountTag: accountId,
    TunnelSecret: secret,
    TunnelID: tunnelId
  };
}
```

### Ingress Config Format

**Location:** `~/.tuna/config-{tunnel_id}.yml`

**Content:**
```yaml
tunnel: c1744f8b-faa1-48a4-9e5c-02ac921467fa
credentials-file: /Users/you/.tuna/tunnels/c1744f8b-faa1-48a4-9e5c-02ac921467fa.json

ingress:
  - hostname: my-app.example.com
    service: http://localhost:3000
  - service: http_status:404
```

**Rules:**
- Must have at least 2 ingress rules
- Last rule must be catch-all (no hostname)
- Hostname must match DNS record

**Service Formats:**
- `http://localhost:3000` - HTTP to local port
- `https://localhost:3000` - HTTPS to local port
- `tcp://localhost:3000` - TCP (for SSH, etc.)
- `http_status:404` - Return 404 (catch-all)

---

## API Client Implementation Example

```typescript
import axios from 'axios';

class CloudflareAPI {
  private client;
  
  constructor(apiToken: string, accountId: string) {
    this.client = axios.create({
      baseURL: 'https://api.cloudflare.com/client/v4',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Add retry interceptor
    this.client.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 429) {
          // Rate limited, retry after delay
          const retryAfter = error.response.headers['retry-after'] || 5;
          await new Promise(r => setTimeout(r, retryAfter * 1000));
          return this.client.request(error.config);
        }
        throw error;
      }
    );
  }
  
  // Methods here...
}
```

---

---

## Access Operations

### List Access Applications

**Endpoint:** `GET /accounts/{account_id}/access/apps`

**Response:**
```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": [
    {
      "id": "f174e90a-fafe-4643-bbbc-4a0ed4fc8415",
      "name": "tuna-app-example-com",
      "domain": "app.example.com",
      "type": "self_hosted",
      "session_duration": "24h",
      "created_at": "2026-01-25T10:00:00Z",
      "updated_at": "2026-01-25T10:00:00Z"
    }
  ]
}
```

### Create Access Application

**Endpoint:** `POST /accounts/{account_id}/access/apps`

**Request:**
```json
{
  "name": "tuna-app-example-com",
  "domain": "app.example.com",
  "type": "self_hosted",
  "session_duration": "24h"
}
```

**Response:**
```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": {
    "id": "f174e90a-fafe-4643-bbbc-4a0ed4fc8415",
    "name": "tuna-app-example-com",
    "domain": "app.example.com",
    "type": "self_hosted",
    "session_duration": "24h",
    "created_at": "2026-01-25T10:00:00Z",
    "updated_at": "2026-01-25T10:00:00Z"
  }
}
```

### Delete Access Application

**Endpoint:** `DELETE /accounts/{account_id}/access/apps/{app_id}`

**Response:**
```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": {
    "id": "f174e90a-fafe-4643-bbbc-4a0ed4fc8415"
  }
}
```

---

## Access Policy Operations

### List Access Policies

**Endpoint:** `GET /accounts/{account_id}/access/apps/{app_id}/policies`

**Response:**
```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": [
    {
      "id": "699d98642c564d2e855e9661899b7252",
      "name": "tuna-access-policy",
      "decision": "allow",
      "include": [
        { "email_domain": { "domain": "company.com" } },
        { "email": { "email": "contractor@gmail.com" } }
      ],
      "precedence": 1,
      "created_at": "2026-01-25T10:00:00Z",
      "updated_at": "2026-01-25T10:00:00Z"
    }
  ]
}
```

### Create Access Policy

**Endpoint:** `POST /accounts/{account_id}/access/apps/{app_id}/policies`

**Request:**
```json
{
  "name": "tuna-access-policy",
  "decision": "allow",
  "include": [
    { "email_domain": { "domain": "company.com" } },
    { "email": { "email": "contractor@gmail.com" } }
  ],
  "precedence": 1
}
```

**Policy Include Rules:**
- Email domain: `{ "email_domain": { "domain": "company.com" } }`
- Specific email: `{ "email": { "email": "user@example.com" } }`
- Everyone: `{ "everyone": {} }`

**Response:**
```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": {
    "id": "699d98642c564d2e855e9661899b7252",
    "name": "tuna-access-policy",
    "decision": "allow",
    "include": [
      { "email_domain": { "domain": "company.com" } },
      { "email": { "email": "contractor@gmail.com" } }
    ],
    "precedence": 1,
    "created_at": "2026-01-25T10:00:00Z",
    "updated_at": "2026-01-25T10:00:00Z"
  }
}
```

### Update Access Policy

**Endpoint:** `PUT /accounts/{account_id}/access/apps/{app_id}/policies/{policy_id}`

**Request:** Same format as create.

**Response:** Same format as create.

### Delete Access Policy

**Endpoint:** `DELETE /accounts/{account_id}/access/apps/{app_id}/policies/{policy_id}`

**Response:**
```json
{
  "success": true,
  "errors": [],
  "messages": [],
  "result": {
    "id": "699d98642c564d2e855e9661899b7252"
  }
}
```

---

## Access Configuration in Tuna

Tuna maps the `access` config array to Access policies:

**Config:**
```json
{
  "tuna": {
    "access": ["@company.com", "contractor@gmail.com"]
  }
}
```

**Resulting Policy:**
```json
{
  "name": "tuna-access-policy",
  "decision": "allow",
  "include": [
    { "email_domain": { "domain": "company.com" } },
    { "email": { "email": "contractor@gmail.com" } }
  ]
}
```

**Pattern Parsing:**
- `@company.com` → `{ "email_domain": { "domain": "company.com" } }`
- `user@example.com` → `{ "email": { "email": "user@example.com" } }`

**Authentication:**
- Uses One-time PIN by default (no IdP setup required)
- Users receive a PIN via email to authenticate

---

## References

- [Cloudflare API Documentation](https://developers.cloudflare.com/api/)
- [Tunnel API Reference](https://developers.cloudflare.com/api/resources/zero_trust/subresources/tunnels/)
- [DNS API Reference](https://developers.cloudflare.com/api/resources/dns/subresources/records/)
- [Access API Reference](https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/applications/)
- [Tunnel Configuration](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configure-tunnels/)
