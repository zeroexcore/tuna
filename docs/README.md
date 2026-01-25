# Tuna Documentation

This directory contains comprehensive documentation for the Tuna project - a Cloudflare Tunnel Wrapper for Development Servers.

## Documentation Structure

### [00-overview.md](./00-overview.md)
**What it covers:**
- Project overview and core concept
- Key features and use cases
- Architecture diagram
- Technical stack
- Security model
- Quick start guide
- Comparison to alternatives

**Read this first** to understand what Tuna is and why it exists.

### [01-architecture.md](./01-architecture.md)
**What it covers:**
- Detailed system components
- Module breakdown (credentials, config, API, service, process)
- Data flow diagrams
- File system structure
- Error handling strategies
- Security considerations
- Performance considerations
- Dependencies

**Read this** when implementing core libraries and understanding how components interact.

### [02-commands.md](./02-commands.md)
**What it covers:**
- Complete specification for each CLI command
- Input/output formats
- Interactive flows
- Error handling per command
- Exit codes
- Environment variables
- Global flags

**Read this** when implementing CLI commands and user interactions.

### [03-implementation.md](./03-implementation.md)
**What it covers:**
- Step-by-step implementation plan
- Project setup instructions
- TypeScript configuration
- Detailed code structure
- Phase-by-phase development workflow
- Testing strategies
- Deployment process

**Read this** when starting development and following the implementation phases.

### [04-api-reference.md](./04-api-reference.md)
**What it covers:**
- Complete Cloudflare API reference
- Authentication requirements
- Endpoint specifications
- Request/response formats
- Error codes and handling
- Rate limiting strategies
- Tunnel configuration formats

**Read this** when implementing the Cloudflare API client and understanding API interactions.

### [05-team-collaboration.md](./05-team-collaboration.md)
**What it covers:**
- Environment variable interpolation feature
- Preventing subdomain conflicts in teams
- Configuration examples for collaboration
- Best practices and troubleshooting
- Migration guide
- FAQ

**Read this** to understand how teams can use tuna without conflicts using `$USER` and `$TUNA_USER` variables.

## Implementation Phases

The project is broken into 7 phases:

### Phase 1: Project Setup
- Initialize Node.js/TypeScript project
- Configure build system
- Create project structure
- Install dependencies

**Status:** 📝 Ready to start
**Documents:** 03-implementation.md § Phase 1

### Phase 2: Type Definitions
- Create TypeScript interfaces
- Define configuration schemas
- Define API response types

**Status:** ⏳ Pending Phase 1
**Documents:** 03-implementation.md § Phase 2, 01-architecture.md § System Components

### Phase 3: Core Libraries
- Credential management (Keychain)
- Config reading (package.json)
- Cloudflare API client
- Cloudflared binary management

**Status:** ⏳ Pending Phase 2
**Documents:** 01-architecture.md, 03-implementation.md § Phase 3, 04-api-reference.md

### Phase 4: Cloudflared Management
- Detect/install cloudflared binary
- Generate tunnel credentials
- Manage binary execution

**Status:** ⏳ Pending Phase 3
**Documents:** 01-architecture.md § Cloudflared Manager

### Phase 5: Service Management
- Install cloudflared as service
- Generate ingress configurations
- Start/stop/restart service
- Service status monitoring

**Status:** ⏳ Pending Phase 4
**Documents:** 01-architecture.md § Service Manager, 04-api-reference.md § Tunnel Configuration

### Phase 6: Command Implementations
- `tuna --login` - Authentication setup
- `tuna <command>` - Wrapper command
- `tuna --list` - List tunnels
- `tuna --stop` - Stop service
- `tuna --delete` - Delete tunnel

**Status:** ⏳ Pending Phase 5
**Documents:** 02-commands.md, 01-architecture.md § Data Flow

### Phase 7: Testing & Polish
- Error handling
- User-friendly messages
- Help documentation
- README
- Testing

**Status:** ⏳ Pending Phase 6
**Documents:** All documents

## Quick Reference

### Key Design Decisions

| Decision | Choice | Document |
|----------|--------|----------|
| Credential storage | macOS Keychain with biometric auth | 00-overview.md, 01-architecture.md |
| Configuration | package.json "tuna" field | 00-overview.md, 02-commands.md |
| Command structure | Flags for management (--login, --list) | 02-commands.md |
| Service model | cloudflared as persistent service | 01-architecture.md |
| Tunnel naming | tuna-{sanitized-forward} | 01-architecture.md, 02-commands.md |
| Installation | Local per-project (npm install) | 00-overview.md |

### Key Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Node.js 18+ / TypeScript | Main application |
| CLI Framework | Commander.js | Command parsing |
| Process Management | execa | Child process spawning |
| Credential Storage | keytar | macOS Keychain access |
| API Client | axios | Cloudflare API calls |
| Service | cloudflared | Tunnel daemon |
| UI | chalk, ora, inquirer | Terminal UI |

### File Locations

| Type | Location | Purpose |
|------|----------|---------|
| Credentials | macOS Keychain | API tokens (encrypted) |
| Tunnel credentials | `~/.tuna/tunnels/{id}.json` | Per-tunnel credentials |
| Ingress config | `~/.tuna/config-{id}.yml` | Cloudflared configuration |
| Cloudflared binary | `~/.tuna/bin/cloudflared` | Downloaded binary (optional) |
| Project config | `./package.json` | Tuna configuration |

### API Permissions Required

When creating a Cloudflare API token, grant these permissions:

- **Account** → Cloudflare Tunnel → **Edit**
- **Zone** → DNS → **Edit**
- **Account** → Account Settings → **Read**

### Common Commands

```bash
# Setup
tuna --login

# Run dev server with tunnel
tuna vite dev --port 3000

# Management
tuna --list
tuna --stop
tuna --delete
```

## Development Workflow

1. **Read documentation** in order (00 → 04)
2. **Follow implementation plan** (03-implementation.md)
3. **Refer to architecture** when implementing components (01-architecture.md)
4. **Check command specs** when implementing CLI (02-commands.md)
5. **Use API reference** when implementing Cloudflare integration (04-api-reference.md)

## Testing Checklist

### Manual Testing
- [ ] Install in fresh project
- [ ] Run `tuna --login` with valid token
- [ ] Configure package.json
- [ ] Run `tuna vite dev --port 3000`
- [ ] Verify tunnel URL works
- [ ] Test `tuna --list` shows tunnel
- [ ] Test `tuna --stop` stops service
- [ ] Test `tuna --delete` cleans up
- [ ] Test with multiple projects
- [ ] Test error scenarios (no config, invalid token, etc.)

### Integration Testing
- [ ] Tunnel creation via API
- [ ] DNS record creation via API
- [ ] Service installation
- [ ] Service start/stop
- [ ] Child process stdio piping
- [ ] Biometric authentication
- [ ] Multiple domains

### Edge Cases
- [ ] No package.json found
- [ ] Missing tuna config
- [ ] Invalid domain format
- [ ] Port already in use
- [ ] Zone not found in Cloudflare
- [ ] Invalid/expired API token
- [ ] Network failures
- [ ] Rate limiting
- [ ] Keychain access denied

## Support

For questions or issues during development, refer to:

1. **This documentation** first
2. **Cloudflare API docs**: https://developers.cloudflare.com/api/
3. **Cloudflare Tunnel docs**: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

## Contributing

When adding new features:

1. Update relevant documentation files
2. Add to implementation plan if multi-phase
3. Update command specifications if user-facing
4. Document new API endpoints if applicable

## License

TBD
