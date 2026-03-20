# fallow docs: agent instructions

## What this is

Mintlify documentation site for [fallow](https://github.com/fallow-rs/fallow), a dead code and duplication analyzer for JavaScript/TypeScript. Built in Rust. Three audiences: AI agents, human developers, CI pipelines.

## Dev server

```bash
npx mintlify dev
```

## File structure

- `docs.json` — navigation, tabs, theme, redirects. Edit this to add/reorder pages.
- `*.mdx` files — content pages. YAML frontmatter (`title`, `description`, `keywords`, `icon`) required on every page.
- `snippets/` — reusable MDX fragments.
- `logo/`, `images/` — static assets.
- `custom.css` — theme overrides.

## Key files

- `index.mdx` — landing page. Speed benchmarks, feature overview, "three tracks" narrative.
- `quickstart.mdx` — getting started for all three tracks (agents, humans, CI).
- `integrations/mcp.mdx` — agent integration via CLI and MCP. Core page for agent audience.

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
- "dead code" in prose, `unused-exports` (hyphenated) for rule names.
- "duplication" not "code clones". "plugins" not "presets".

### Numbers to keep accurate
- 11 issue types (unused files, exports, types, dependencies, devDependencies, enum members, class members, unresolved imports, unlisted deps, duplicate exports, circular dependencies).
- 84 built-in plugins.
- Benchmarks must match the fallow repo README.

### Narrative structure
Three tracks run through the docs: agents, humans, CI. Most pages address all three. Tabs split track-specific content. This is the central organizing principle.

### Page structure
- YAML frontmatter: `title`, `description`, `keywords`, `icon`.
- All code blocks need language tags.
- End every page with a "See also" CardGroup linking related pages.

### Mintlify components
Tabs, Steps, Cards, CardGroup, Accordion, Info, Tip, Warning, Note, CodeGroup.

## Content boundaries

- Document the public CLI, configuration, and integrations only.
- Do not document Rust internals.

## Verifying changes

1. Run `npx mintlify dev` and check the page renders.
2. Check all links resolve (no broken hrefs).
3. Confirm frontmatter has all four required fields.
