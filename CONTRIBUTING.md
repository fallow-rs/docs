# Contributing to fallow docs

## Quick edits

For a quick fix, open an issue or a pull request in this repository. The pages are published at [fallow.tools/docs](https://fallow.tools/docs/).

## Local setup

```bash
git clone https://github.com/fallow-rs/docs
cd docs
npm ci
git config core.hooksPath .githooks    # refreshes the content manifest on commit
```

This repository has no local preview server. The fallow.tools site renders
the pages from a pinned commit of `main`.

## Before submitting

```bash
npm run check
```

When a commit changes public content, the hook refreshes and stages
`public-content-manifest.json` for you. You need `npm run content:manifest` only
if you skipped the hook setup above. The hook derives the manifest from the
content only, so it never makes an editorial decision for you.

Before you submit, review the manifest diff. It lists exactly the content that
becomes public. Do not add any of this content:

- private implementation notes
- operations material
- security runbooks
- roadmap details
- content copied from a private repository

[PUBLICATION.md](PUBLICATION.md) has the ownership and synchronization rules.

## Writing guidelines

Follow the [writing conventions in AGENTS.md](AGENTS.md#writing-conventions).
They cover tone, terminology, volatile facts, page structure, and
components.

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

Add every user-facing page to `docs.json`. `docs.json` is the source of truth
for navigation order. This table defines where new content belongs.

## Developer Certificate of Origin

This project uses the [Developer Certificate of Origin](https://developercertificate.org/) (DCO). With a sign-off, you confirm that you wrote the change or have the right to submit it under the project license.

Add a `Signed-off-by` line to every commit with the `-s` flag:

```bash
git commit -s -m "fix: describe the change"
```

The email in the line must match the commit author. To sign off commits you already made:

```bash
git rebase --signoff origin/main
git push --force-with-lease
```

The `DCO sign-off` check fails a pull request that has a commit without a sign-off. Pull requests from bots are exempt.
