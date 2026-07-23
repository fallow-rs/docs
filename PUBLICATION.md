# Public documentation ownership

This repository is the canonical source for fallow's public user documentation.
It owns the prose published at `docs.fallow.tools` and the public content archive
consumed by other fallow systems.

## Boundary

Content in the public archive is selected by an explicit allowlist in
`scripts/public-content.mjs`. The archive contains public MDX pages, site
configuration, styles, and public assets. It does not contain repository
instructions, development tooling, skills, private implementation notes, or
content from another repository.

Private repositories may consume a pinned archive from this repository. They
must not publish their own internal documentation or copy private content into
the archive automatically. A private insight that belongs in public user
documentation must be rewritten for the public audience and submitted here as
a normal reviewable change.

## Sources of truth

- Public user guidance and examples: this repository.
- Public CLI and configuration behavior: the `fallow-rs/fallow` implementation
  and its generated contracts.
- Public protocol shapes: their public protocol repository.
- Private architecture, operations, security, roadmap, and commercial context:
  the private repository that owns that information.

When product behavior and prose differ, fix the product contract first or
update this repository in the same coordinated change.

## Publication artifacts

`public-content-manifest.json` records every packaged path, byte size, and
SHA-256 digest. Its aggregate digest identifies the complete public content
set.

The CI workflow creates:

- `fallow-public-docs.tar.gz`, a reproducible archive with normalized metadata.
- `fallow-public-docs.provenance.json`, the source repository, branch, commit,
  content digest, and archive digest.

Consumers must pin the source commit or verify both digests before using an
artifact.

## Changing the public content set

1. Add or edit public content in an allowlisted directory.
2. Update `docs.json` when navigation changes.
3. Run `npm run content:manifest`.
4. Run `npm run check`.
5. Review the manifest diff. Unexpected paths are a publication blocker.

Do not widen the allowlist to package an internal document. Move only public,
audience-appropriate content into this repository.
