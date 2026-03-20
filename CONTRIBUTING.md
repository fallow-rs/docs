# Contributing to fallow docs

## Quick edits

Every page on [docs.fallow.tools](https://docs.fallow.tools) has "Suggest edits" and "Raise issue" links at the bottom. Use those for quick fixes.

## Local development

```bash
git clone https://github.com/fallow-rs/docs
cd docs
npm i -g mint
mint dev
```

Preview at `http://localhost:3000`.

## Before submitting

```bash
mint broken-links    # Check for broken links
mint validate        # Validate the build
```

## Writing guidelines

- Sentence case for headings
- Active voice, second person ("you")
- All code blocks need language tags
- Use Mintlify components (Tabs, Steps, Accordion, CodeGroup, callouts)
- Add `keywords` to page frontmatter for SEO
- End pages with a "See also" section linking to related pages

## File structure

| Directory | Content |
|:----------|:--------|
| `analysis/` | Dead code, duplication, auto-fix, debugging |
| `cli/` | CLI command reference |
| `configuration/` | Config files, rules, workspaces |
| `frameworks/` | Built-in and custom plugins |
| `integrations/` | CI, VS Code, MCP server |
| `migration/` | From knip and jscpd |
| `snippets/` | Reusable MDX components |
