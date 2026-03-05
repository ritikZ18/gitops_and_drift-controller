# User Manual

## Getting Started

### What is gitopsctl-web?

A platform-grade internal tool for managing OpenShift releases using GitOps practices. It provides:

- **Drift Detection** — See what's different between your Git manifests and the live cluster
- **Release Controls** — Promote, rollback, and freeze with guardrails
- **Rollout Health** — Real-time rollout status and failure diagnostics
- **Audit Trail** — Complete log of who did what and when

### Lifecycle Management

Use the `start.sh` script in the root directory to manage the application services:

- **Start all (Debug)**: `./start.sh --debug` (Recommended for development)
- **Start all (Prod)**: `./start.sh --all` (Builds and starts production versions)
- **Stop all**: `./start.sh --stop` (Identifies and kills processes on ports 8080/3000)
- **Restart**: `./start.sh --stop && ./start.sh --debug`

### Navigating the Interface

The interface uses a **3-pane terminal layout**:

```
┌──────────┬──────────────┬──────────────────┐
│ APPS     │ DETAILS      │ CONTEXT PANEL    │
│ (list)   │ (selected)   │ (tabs)           │
└──────────┴──────────────┴──────────────────┘
```

| Pane | Content |
|------|---------|
| **Left** | List of all apps with sync/health status |
| **Center** | Detailed status of the selected app |
| **Right** | Tabbed view: Events, Drift, History, Audit |

---

## Keyboard Navigation

### Moving Around

| Key | Action |
|-----|--------|
| `j` / `↓` | Move down in app list |
| `k` / `↑` | Move up in app list |
| `g` | Jump to top |
| `G` | Jump to bottom |
| `/` | Open search |
| `Esc` | Close search / modal |
| `e` | Cycle environment (all → staging → production) |

### Tabs

| Key | Action |
|-----|--------|
| `Tab` | Next tab |
| `Shift+Tab` | Previous tab |
| `1` | Events tab |
| `2` | Drift tab |
| `3` | History tab |
| `4` | Audit tab |

### Actions

| Key | Action |
|-----|--------|
| `p` | Open Promote modal |
| `r` | Open Rollback modal |
| `f` | Open Freeze/Unfreeze modal |
| `a` | Open Register App modal |
| `y` | Confirm action |
| `n` | Cancel action |

### Filters

| Key | Action |
|-----|--------|
| `H` | Toggle healthy-only filter |
| `D` | Toggle high-drift filter |
| `O` | Toggle out-of-sync filter |
| `F` | Toggle frozen-only filter |
| `.` | Refresh data |
| `?` | Show help overlay |

---

## Common Workflows

### Check App Status

1. Open the app → selected in left pane
2. View sync/health/drift status in center pane
3. Check Events tab for cluster issues

### Investigate Drift

1. Select the app
2. Press `2` or `d` to open Drift tab
3. Review affected resources and diffs
4. Follow the triage steps listed

### Promote / Sync

1. Select the app
2. Press `p` to open Promote modal
3. Review target revision and impact
4. Press `y` to confirm

### Rollback

1. Select the app
2. Press `r` to open Rollback modal
3. Use `j`/`k` to select a previous revision
4. Enter a reason
5. Press `y` to confirm

### Freeze an App

1. Select the app
2. Press `f` to open Freeze modal
3. Enter the incident ID or reason
4. Press `y` to confirm
5. Frozen apps show ❄ badge and reject sync/rollback attempts

---

## Status Indicators

| Symbol | Meaning |
|--------|---------|
| `✓ SYNCED` | Git desired state matches live cluster |
| `≠ OUT_OF_SYNC` | Live cluster has drifted from Git |
| `● HEALTHY` | All pods running and passing health checks |
| `▲ PROGRESSING` | Rollout in progress |
| `✗ DEGRADED` | Failures detected (check Events tab) |
| `❄` | App is frozen (no actions allowed) |

---

## Troubleshooting

### "App is frozen" error when promoting
→ An SRE has frozen this app. Check the freeze reason and coordinate with the team.

### Promote succeeds but health stays DEGRADED
→ Check the Events tab for pod-level issues (ImagePull, OOM, CrashLoop).

### No drift shown for out-of-sync app
→ Drift is computed per-environment. Switch environment with `e` key.
