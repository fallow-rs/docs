# Contributing to fallow docs

## Quick edits

Every page on [docs.fallow.tools](https://docs.fallow.tools) has "Suggest edits" and "Raise issue" links at the bottom. Use those for quick fixes.

## Local development

```bash
git clone https://github.com/fallow-rs/docs
cd docs
npm ci
git config core.hooksPath .githooks    # refreshes the content manifest on commit
npm run docs:dev
```

Preview at `http://localhost:3000`.

## Before submitting

```bash
npm run check
```

With the hook enabled, `public-content-manifest.json` is refreshed and staged
for you whenever a commit changes public content, so `npm run content:manifest`
is only needed if you skipped the hook setup above. The manifest is fully
derived from the content, so the hook can never make an editorial decision on
your behalf.

Review the manifest diff before submitting. It is the exact public content set.
Do not add private implementation notes, operations material, security
runbooks, roadmap details, or content copied from a private repository. See
[PUBLICATION.md](PUBLICATION.md) for ownership and synchronization rules.

## Writing guidelines

Follow the writing conventions in [AGENTS.md](AGENTS.md#writing-conventions):
tone, terminology, volatile facts, page structure, and Mintlify components.

## Content placement

| Directory | Content |
|:----------|:--------|
| Root `.mdx` pages | Landing, installation, quickstart, and adoption |
| `analysis/` | Dead code, duplication, auto-fix, debugging |
| `cli/` | CLI command reference |
| `cloud/` | Public cloud and beacon workflows |
| `configuration/` | Config files, rules, workspaces |
| `explanations/` | Concepts, tradeoffs, telemetry, and mental models |
| `frameworks/` | Built-in and custom plugins |
| `integrations/` | CI, VS Code, MCP server |
| `migration/` | From knip and jscpd |
| `images/`, `logo/` | Public visual assets |

Add every user-facing page to `docs.json`. That file is the source of truth for
navigation order, while this table defines where new content belongs.
