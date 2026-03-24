<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/fallow-rs/fallow/main/assets/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/fallow-rs/fallow/main/assets/logo.svg">
    <img src="https://raw.githubusercontent.com/fallow-rs/fallow/main/assets/logo.svg" alt="fallow" width="290">
  </picture><br>
  <strong>Documentation for the codebase analyzer for TypeScript and JavaScript.</strong><br><br>
  <a href="https://docs.fallow.tools"><img src="https://img.shields.io/badge/docs-docs.fallow.tools-blue.svg" alt="Documentation"></a>
  <a href="https://github.com/fallow-rs/fallow"><img src="https://img.shields.io/badge/fallow-GitHub-orange" alt="fallow"></a>
</p>

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
