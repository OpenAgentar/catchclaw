# E2E Integration Tests

End-to-end tests for the CatchClaw agentar CLI (`skill/install/agentar_cli.mjs`).

## Prerequisites

- **Node.js** (v18+)
- **Network access** to the CatchClaw API (defaults to `https://catchclaw.me`)
- **bash** shell

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENTAR_HOME` | `~/.openclaw-test` | CLI config directory (isolated from real config) |
| `AGENTAR_API_BASE_URL` | `https://catchclaw.me` | Backend API base URL |

## Running Tests

Run individual tests:

```bash
bash tests/test-agent-search.sh
bash tests/test-agent-install.sh
bash tests/test-team-search.sh
bash tests/test-team-install.sh
bash tests/test-team-status.sh
bash tests/test-team-remove.sh
```

Run all tests in sequence:

```bash
for t in tests/test-*.sh; do echo "--- $t ---"; bash "$t" || exit 1; done
```

## Test Descriptions

| Script | What it tests |
|--------|---------------|
| `test-agent-search.sh` | Search for "orchestrator", assert results non-empty |
| `test-agent-install.sh` | Install agent "orchestrator", verify workspace + SOUL.md |
| `test-team-search.sh` | Search for "openclaw-starter", assert results contain the team |
| `test-team-install.sh` | Install team "openclaw-starter-team", assert team.yaml + members |
| `test-team-status.sh` | Run team status, assert output contains member info |
| `test-team-remove.sh` | Remove team, assert team.yaml deleted but workspaces preserved |

## Known Limitations

- **Network required**: All tests call the production API. They will fail without network access.
- **Team commands**: The team tests (`test-team-*.sh`) require team subcommands (`agentar team search/install/status/remove`) in the CLI. If the bundled CLI does not yet include team support, these tests will fail with "unknown command".
- **Workspace paths**: The CLI writes agent workspaces to `~/.openclaw/agentar-workspaces/` and team registries to `~/.openclaw/agentar-teams/` (hardcoded). The `AGENTAR_HOME` variable only isolates the CLI config directory, not workspace data.
- **Idempotency**: Each test sources `teardown.sh` which cleans `AGENTAR_HOME`. Agent workspaces under `~/.openclaw/` persist across runs. Run team tests in order: install before status/remove.

## File Structure

```
tests/
  README.md           -- this file
  setup.sh            -- set env vars, create temp config dir
  teardown.sh         -- clean up temp config dir
  test-agent-search.sh
  test-agent-install.sh
  test-team-search.sh
  test-team-install.sh
  test-team-status.sh
  test-team-remove.sh
```
