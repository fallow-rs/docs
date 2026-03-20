# fallow docs

Documentation for [fallow](https://github.com/fallow-rs/fallow) — the dead code and duplication analyzer for JavaScript and TypeScript.

**Live at [docs.fallow.tools](https://docs.fallow.tools)**

## Development

```bash
npm i -g mint
mint dev
```

Preview at `http://localhost:3000`.

## Structure

```
analysis/       — Dead code, duplication, auto-fix, debugging
cli/            — CLI command reference
configuration/  — Config files, rules, workspaces
frameworks/     — Built-in and custom plugins
integrations/   — CI, VS Code, MCP server
migration/      — From knip and jscpd
snippets/       — Reusable MDX components
```

## Contributing

Edit any `.mdx` file and push to `main`. Mintlify deploys automatically.

Run `mint broken-links` and `mint validate` before pushing.
