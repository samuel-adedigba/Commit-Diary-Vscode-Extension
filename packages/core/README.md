# CommitDiary Core

Shared logic for commit parsing, categorization, and analytics. This package is designed to be usable on its own and also powers other CommitDiary packages.

- Back to root: [../../README.md](../../README.md)
- Related packages: [../extension/README.md](../extension/README.md) • [../api/README.md](../api/README.md) • [../web-dashboard/README.md](../web-dashboard/README.md)

## Package Flow

```mermaid
flowchart LR
  A[Git history / commit metadata] --> B[Core parse + categorize]
  B --> C[Metrics + grouping]
  B --> D[Component detection]
  C --> E[Consumers (Extension / API / Dashboard)]
```

## What This Package Provides

- Commit categorization utilities
- Parsing helpers for git output and commit metadata
- Metrics helpers (grouping, summaries, time-based bucketing)
- TypeScript types used across packages

## Standalone Setup

### Prerequisites

- Node.js 18+
- pnpm

### Install

```bash
cd packages/core
pnpm install
```

### Build

```bash
pnpm build
```

## ✅ Why This Setup Works

- Core has no runtime services, so builds are fast and portable
- Shared types keep extension and API consistent
- Pure utilities make it easy to test and reuse

## How It Connects to CommitDiary

- Used by the extension to classify and summarize commits before syncing
- Can be used by the API for server-side analytics or validation
- Drives shared data contracts (types and structured commit payloads)

## Local Development Notes

- Source lives in packages/core/src
- Output builds to packages/core/dist
- If you change types, rebuild before using from other packages

## Contributing

1. Create a feature branch
2. Update or add tests (if applicable)
3. Run pnpm build
4. Ensure downstream packages still compile

If you are contributing to the monorepo, start at [../../README.md](../../README.md) for the full workflow.
