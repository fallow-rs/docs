<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/fallow-rs/fallow/main/assets/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/fallow-rs/fallow/main/assets/logo.svg">
    <img src="https://raw.githubusercontent.com/fallow-rs/fallow/main/assets/logo.svg" alt="fallow" width="290">
  </picture><br>
  <strong>Documentation for fallow, codebase intelligence for TypeScript and JavaScript.</strong><br><br>
  <a href="https://docs.fallow.tools"><img src="https://img.shields.io/badge/docs-docs.fallow.tools-blue.svg" alt="Documentation"></a>
  <a href="https://github.com/fallow-rs/fallow"><img src="https://img.shields.io/badge/fallow-GitHub-orange" alt="fallow"></a>
</p>

## Development

```bash
npm ci
npm run docs:dev
```

Preview at `http://localhost:3000`.

This repository is the canonical source for fallow's public user
documentation. See [PUBLICATION.md](PUBLICATION.md) for the public-only boundary,
artifact provenance, and synchronization contract.

## Structure

Public pages are grouped by user task. See the complete placement map in
[CONTRIBUTING.md](CONTRIBUTING.md#content-placement). `docs.json` is the source
of truth for navigation order.

## Contributing

Edit any `.mdx` file and push to `main`. Mintlify deploys automatically.

Run `npm run content:manifest` after changing public content, then run
`npm run check` before pushing.
