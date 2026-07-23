# fallow docs: agent instructions

## What this is

Mintlify documentation site for [fallow](https://github.com/fallow-rs/fallow), deterministic codebase intelligence for TypeScript and JavaScript. Three audiences: AI agents, human developers, CI pipelines.

This repository is the canonical source for public user documentation. Read
`PUBLICATION.md` before changing publication tooling or moving content between
repositories.

## Dev server

```bash
npm ci
npm run docs:dev
```

## File structure

- `docs.json`: navigation, tabs, theme, redirects. Edit this to add/reorder pages.
- `*.mdx` files: content pages. YAML frontmatter (`title`, `description`, `keywords`, `icon`) required on every page.
- `snippets/`: reusable MDX fragments.
- `logo/`, `images/`: static assets.
- `custom.css`: theme overrides.
- `CONTRIBUTING.md`: canonical content placement map.

## Key files

- `index.mdx`: landing page. Codebase intelligence positioning, speed benchmarks, feature overview, "three tracks" narrative.
- `quickstart.mdx`: getting started for all three tracks (agents, humans, CI).
- `integrations/mcp.mdx`: agent integration via CLI and MCP. Core page for agent audience.

## Writing conventions

### Tone
- Direct, short sentences. No filler.
- Second person ("you"), active voice.
- No em dashes. Use periods, commas, or colons instead.
- No AI writing tells: never write "Whether you're...", "especially", "it's worth noting", "in order to", or hedging language.
- No marketing words: "powerful", "seamless", "robust", "effortlessly".
- Sentence case for headings ("Getting started", not "Getting Started").

### Terminology
- "fallow" lowercase. "Fallow" only at sentence start.
- "cleanup opportunities" for the product pillar, "dead code" only for the specific analysis family, `unused-exports` (hyphenated) for rule names.
- "duplication" not "code clones". "plugins" not "presets".

### Volatile facts
- Do not hardcode plugin or issue-type totals. Describe coverage by capability.
- Benchmarks must match the fallow repository README.
- Prefer generated CLI output or public source contracts for current values.

### Narrative structure
Agents, human developers, and CI users are recurring audiences. Use
track-specific tabs only when their instructions materially differ.

### Page structure
- YAML frontmatter: `title`, `description`, `keywords`, `icon`.
- All code blocks need language tags.
- End every page with a "See also" CardGroup linking related pages.

### Mintlify components
Tabs, Steps, Cards, CardGroup, Accordion, Info, Tip, Warning, Note, CodeGroup.

## Content boundaries

- Document the public CLI, configuration, and integrations only.
- Do not document Rust internals.
- Never copy private repository content into this repository automatically.
- Private insights require a public rewrite and normal review in this repository.
- Keep `scripts/public-content.mjs` allowlisted. Do not package arbitrary
  directories or follow symlinks.

## Verifying changes

1. Run `npm run content:manifest` after changing public content.
2. Run `npm run check`.
3. Check the changed page with `npm run docs:dev`.
4. Confirm frontmatter has all four required fields.
5. If you added a page, add it to the correct group in `docs.json`.
6. Check that the change does not introduce volatile totals or duplicate facts.
