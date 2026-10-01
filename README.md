<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/fallow-rs/fallow/main/assets/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/fallow-rs/fallow/main/assets/logo.svg">
    <img src="https://raw.githubusercontent.com/fallow-rs/fallow/main/assets/logo.svg" alt="fallow" width="290">
  </picture><br>
  <strong>Documentation for fallow, codebase intelligence for TypeScript and JavaScript.</strong><br><br>
  <a href="https://fallow.tools/docs/"><img src="https://img.shields.io/badge/docs-fallow.tools%2Fdocs-blue.svg" alt="Documentation"></a>
  <a href="https://github.com/fallow-rs/fallow"><img src="https://img.shields.io/badge/fallow-GitHub-orange" alt="fallow"></a>
</p>

This repository is the canonical source for the public fallow user
documentation at [fallow.tools/docs](https://fallow.tools/docs/).
[PUBLICATION.md](PUBLICATION.md) defines what content can be public, where
artifacts come from, and how synchronization works.

## Structure

The pages are grouped by user task. The complete placement map is in
[CONTRIBUTING.md](CONTRIBUTING.md#content-placement). `docs.json` is the source
of truth for navigation order.

## Contributing

Edit any `.mdx` file and open a pull request against `main`. The fallow.tools
site renders the pages from a pinned commit of this repository, so a merged
change goes live when the site updates its pin. The old host,
`docs.fallow.tools`, now only redirects to [fallow.tools/docs](https://fallow.tools/docs/).
[CONTRIBUTING.md](CONTRIBUTING.md) explains the checks to run before you push.
