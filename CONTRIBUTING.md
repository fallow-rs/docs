# Contributing to fallow docs

## Quick edits

For a quick fix, open an issue or a pull request in this repository. The pages are published at [fallow.tools/docs](https://fallow.tools/docs/).

## Local setup

```bash
git clone https://github.com/fallow-rs/docs
cd docs
npm ci
git config core.hooksPath .githooks    # refreshes the content manifest on commit
```

This repository has no local preview server. The fallow.tools site renders
the pages from a pinned commit of `main`.

## Before submitting

```bash
npm run check
```

`npm run check` also runs the page checks of [PAGE-TYPES.md](PAGE-TYPES.md#checks).
When you fix a violation on a page, run
`node scripts/check-pages.mjs --update-baseline` and commit the lower
baseline.

When a commit changes public content, the hook refreshes and stages
`public-content-manifest.json` for you. You need `npm run content:manifest` only
if you skipped the hook setup above. The hook derives the manifest from the
content only, so it never makes an editorial decision for you.

Before you submit, review the manifest diff. It lists exactly the content that
becomes public. Do not add any of this content:

- private implementation notes
- operations material
- security runbooks
- roadmap details
- content copied from a private repository

[PUBLICATION.md](PUBLICATION.md) has the ownership and synchronization rules.

## Writing guidelines

Follow the [writing conventions in AGENTS.md](AGENTS.md#writing-conventions).
They cover tone, terminology, volatile facts, page structure, and
components.

## Content placement

The directory of a page sets its page type.
[PAGE-TYPES.md](PAGE-TYPES.md) defines each type, its sections and its line
budget.

| Content | Page type | Directory |
|:--|:--|:--|
| A first result in one sitting | Tutorial | `quickstart.mdx`, `start/` |
| One idea that the analyses depend on | Concept | `concepts/` |
| What one analysis finds and how to act on it | Analysis | `analysis/` |
| One task in a project | Guide | `guides/` |
| The options, output and exit codes of one command | Command reference | `cli/` |
| One issue type | Rule reference | `rules/` |

The other directories hold pages without a page type: `configuration/`,
`explanations/`, `frameworks/`, `integrations/`, `migration/`, `reference/`
and `cloud/`. The root also holds `index.mdx`, `installation.mdx` and
`adoption.mdx`. `images/` and `logo/` hold public visual assets.

When you change the tool:

- A new option appears by regeneration.
- A concept page changes only when the concept changes.
- A new task gets a guide.

Each fact has one owner page. Other pages link to it. Use the terms in
[TERMS.md](TERMS.md).

Add every user-facing page to `docs.json`. `docs.json` is the source of truth
for navigation order.

## Developer Certificate of Origin

This project uses the [Developer Certificate of Origin](https://developercertificate.org/) (DCO). With a sign-off, you confirm that you wrote the change or have the right to submit it under the project license.

Add a `Signed-off-by` line to every commit with the `-s` flag:

```bash
git commit -s -m "fix: describe the change"
```

The email in the line must match the commit author. To sign off commits you already made:

```bash
git rebase --signoff origin/main
git push --force-with-lease
```

The `DCO sign-off` check fails a pull request that has a commit without a sign-off. Pull requests from bots are exempt.
