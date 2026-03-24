# CatchClaw - Agent Marketplace for OpenClaw

[CatchClaw](https://catchclaw.me?utm_source=github&utm_medium=readme&utm_campaign=catchclaw) is an open marketplace for discovering, sharing, and installing AI agent personas (agentars) for [OpenClaw](https://github.com/openclaw/openclaw). Built for developers who build and customize OpenClaw agents.

An **agentar** (agent archive) is a portable, distributable package containing everything an OpenClaw agent needs: personality (SOUL.md), skills, configuration, and workspace files. Install one command, get a fully configured agent.

## Why CatchClaw?

- **One-command install** - Find and install pre-built OpenClaw agent personas in seconds
- **Community-driven** - Browse 200+ agentars shared by developers worldwide
- **Export & share** - Package your OpenClaw agent setup and publish it to the marketplace
- **Zero sensitive data leakage** - Credentials, API keys, `.env`, private keys, and secrets are **automatically excluded** from all exports and uploads. Your sensitive information never leaves your machine.
- **Zero dependencies** - Pure Node.js, no third-party packages required
- **Works everywhere** - macOS, Linux, Windows (PowerShell)

## Quick Start

### Install the CLI

**macOS / Linux:**

```bash
curl -fsSL https://catchclaw.me/api/v1/agentar/install.sh | bash
```

**Windows (PowerShell):**

```powershell
$f="$env:TEMP\agentar_install.ps1"; irm https://catchclaw.me/api/v1/agentar/install.ps1 -OutFile $f; & $f; Remove-Item $f
```

### Install as an OpenClaw Skill

Install CatchClaw as a skill to get built-in agentar management directly in OpenClaw:

```bash
# Via ClawHub
clawhub install catchclaw
```

### Usage

```bash
# Search for agentars
agentar search <keyword>

# Install an agentar as a new OpenClaw agent
agentar install <slug> --name <agent-name>

# Export your OpenClaw agent as a shareable agentar
agentar export --agent <id>

# Rollback to a previous workspace state
agentar rollback
```

## What is an Agentar?

An agentar is a ZIP archive that contains:

| File | Purpose |
|------|---------|
| `SOUL.md` | Agent personality, behavior rules, and system prompt |
| `IDENTITY.md` | Name, avatar, creature type, and visual identity |
| `skills/` | Bundled skills (tools the agent can use) |
| Other files | Custom configuration, templates, knowledge bases |

When you install an agentar, it sets up a complete OpenClaw agent workspace — ready to use immediately.

## Commands

### Search

```bash
agentar search "code review"
agentar search typescript
```

Browse the [CatchClaw marketplace](https://catchclaw.me?utm_source=github&utm_medium=readme&utm_campaign=search) or search from the CLI. Results show name, description, and the slug you need for installation.

### Install

```bash
# Create a new agent (recommended)
agentar install <slug> --name my-agent

# Overwrite the main workspace (auto-backs up first)
agentar install <slug> --overwrite
```

### Export

```bash
# Export an agent to ~/agentar-exports/
agentar export --agent <id>

# Custom output path
agentar export --agent <id> -o ./my-agent.zip

# Include memory file
agentar export --agent <id> --include-memory
```

**Security:** Sensitive files are automatically excluded from all exports — no manual configuration needed. The following patterns are blocked by default:

- `.env` / `.env.*` — environment variables and secrets
- `.credentials` / `.secret` — credential stores
- `.key` / `.pem` / `.p12` / `.pfx` — private keys and certificates
- `id_rsa` / `id_ed25519` — SSH keys
- `.npmrc` / `.pypirc` — package registry tokens
- Any file matching `*token*`, `*secret*`, `*password*` in its name

**Your API keys, tokens, and private credentials will never be included in an export or uploaded to the marketplace.**

### Rollback

```bash
# List available backups and choose one
agentar rollback

# Restore the most recent backup
agentar rollback --latest
```

Every install creates an automatic backup, so rollback is always safe.

## Security & Privacy

CatchClaw is designed with a **zero-leakage** principle — sensitive information never leaves your local machine.

- **Automatic exclusion** — Export and publish operations scan for sensitive file patterns (credentials, keys, tokens, env files) and exclude them before packaging. No opt-in required.
- **Pre-upload validation** — Before any agentar is uploaded to the marketplace, the CLI performs a final check to ensure no secrets are present in the archive.
- **Local-only data** — Your agent memory, conversation history, and workspace state stay on your machine unless you explicitly export them with the `--include-memory` flag.
- **No telemetry** — CatchClaw does not collect or transmit usage data, analytics, or any personally identifiable information.

> **TL;DR:** You can safely use `agentar export` and `agentar publish` without worrying about accidentally leaking API keys, tokens, passwords, or private keys.

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `AGENTAR_API_BASE_URL` | `https://catchclaw.me` | Override the marketplace API endpoint |
| `AGENTAR_HOME` | `~/.agentar` | Override the CLI config directory |

## File Paths

| Path | Purpose |
|------|---------|
| `~/.agentar/` | CLI configuration |
| `~/.openclaw/workspace/` | Main OpenClaw agent workspace |
| `~/.openclaw/agentar-workspaces/` | Per-agent isolated workspaces |
| `~/agentar-exports/` | Default export output directory |

## Requirements

- [Node.js](https://nodejs.org/) >= 16
- [OpenClaw](https://github.com/openclaw/openclaw)

## Contributing

We welcome contributions! Visit the [CatchClaw marketplace](https://catchclaw.me?utm_source=github&utm_medium=readme&utm_campaign=contributing) to:

- Browse and install community agentars
- Publish your own OpenClaw agent personas
- Star and review agentars you find useful

## Links

- [CatchClaw Marketplace](https://catchclaw.me?utm_source=github&utm_medium=readme&utm_campaign=links) - Browse, search, and install agentars
- [OpenClaw](https://github.com/openclaw/openclaw) - Open-source AI coding agent
- [ClawHub](https://clawhub.com) - Skill registry for OpenClaw agents

## License

[Apache License 2.0](LICENSE)
