# Contributing to fallow docs

## Quick edits

Every page on [docs.fallow.tools](https://docs.fallow.tools) has "Suggest edits" and "Raise issue" links at the bottom. Use those for quick fixes.

## Local development

```bash
git clone https://github.com/fallow-rs/docs
cd docs
npm ci
npm run docs:dev
```

Preview at `http://localhost:3000`.

## Before submitting

```bash
npm run content:manifest
npm run check
```

Review the manifest diff before submitting. It is the exact public content set.
Do not add private implementation notes, operations material, security
runbooks, roadmap details, or content copied from a private repository. See
[PUBLICATION.md](PUBLICATION.md) for ownership and synchronization rules.

## Writing guidelines

- Sentence case for headings
- Active voice, second person ("you")
- All code blocks need language tags
- Use Mintlify components (Tabs, Steps, Accordion, CodeGroup, callouts)
- Add `keywords` to page frontmatter for SEO
- End pages with a "See also" section linking to related pages

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
| `snippets/` | Reusable MDX components |
| `images/`, `logo/` | Public visual assets |

Add every user-facing page to `docs.json`. That file is the source of truth for
navigation order, while this table defines where new content belongs.
