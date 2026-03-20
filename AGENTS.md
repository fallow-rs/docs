# fallow documentation — agent instructions

## About this project

- Documentation for [fallow](https://github.com/fallow-rs/fallow), a dead code and duplication analyzer for JS/TS
- Built on [Mintlify](https://mintlify.com), pages are MDX files with YAML frontmatter
- Configuration in `docs.json`, Mintlify skill installed at `.agents/skills/mintlify/`
- Run `mint dev` to preview, `mint broken-links` to check links, `mint validate` to verify build

## Terminology

- "fallow" (lowercase) when referring to the tool/CLI command
- "Fallow" (capitalized) only at the start of a sentence
- "dead code" (not "dead-code" in prose, use hyphenated form only for rule names like `unused-exports`)
- "duplication" (not "code clones" or "copy-paste")
- "plugins" (not "presets" or "integrations" when referring to framework support)

## Style preferences

- Sentence case for all headings ("Getting started", not "Getting Started")
- Second person ("you"), active voice
- No marketing language ("powerful", "seamless", "robust")
- No filler phrases ("it's important to note", "in order to")
- All code blocks must have language tags
- Every page needs `title`, `description`, `keywords`, and `icon` in frontmatter
- Use Mintlify components: Tabs, Steps, Accordion, CodeGroup, Tip/Info/Warning/Note
- Every page should end with a "See also" CardGroup linking to related pages

## Content boundaries

- Document fallow's public CLI interface, configuration, and integrations
- Do not document internal Rust implementation details
- Keep benchmark numbers in sync with the fallow repo's README.md
- Plugin count (currently 79+) should be verified against the actual plugin registry
