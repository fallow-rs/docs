# fallow docs: agent instructions

## What this is

Documentation source for [fallow](https://github.com/fallow-rs/fallow), deterministic codebase intelligence for TypeScript and JavaScript. The fallow.tools site renders these pages at [fallow.tools/docs](https://fallow.tools/docs/). The pages under `cloud/` document Fallow Cloud and render at [docs.fallow.cloud](https://docs.fallow.cloud/); keep them in the "Fallow Cloud" tab of `docs.json`. Three audiences: AI agents, human developers, CI pipelines.

This repository is the canonical source for public user documentation. Read
`PUBLICATION.md` before changing publication tooling or moving content between
repositories.

## Checks

```bash
npm ci
npm run check
```

This repository has no local preview server. The fallow.tools site renders
the pages and reads `docs.json` as its navigation source.

## File structure

- `docs.json`: navigation source. Edit this to add or reorder pages. The site reads only `navigation`. [CONTRIBUTING.md](CONTRIBUTING.md#content-placement) gives the group rules.
- `*.mdx` files: content pages. Every page needs `title` and `description` in its YAML frontmatter. The site also accepts `keywords`, `icon`, `sidebarTitle` and `mode`, and no other key.
- `logo/`, `images/`: static assets.
- `custom.css`: theme overrides.
- `CONTRIBUTING.md`: canonical content placement map.
- `PAGE-TYPES.md`: the page types, their templates, and the page rules.
- `TERMS.md`: the terms to use, their owner pages, and the internal names to avoid.

## Key files

- `index.mdx`: landing page. Positioning of Fallow (static analysis) and Fallow Cloud (production data), feature overview.
- `quickstart.mdx` and `start/`: the first-hour path. The quickstart gives the first run. `start/first-cleanup`, `start/first-ci` and `start/first-agent` follow it.
- `concepts/`: the ideas that the analyses depend on. `TERMS.md` names the concept page that owns each term.
- `integrations/agents.mdx`: the entry page for coding agents. It links to the CLI contract, MCP, skills and hooks.
- `cli/index.mdx` and `cli/global-flags.mdx`: the entry points of the command reference.
- `rules/` and `reference/`: generated reference. Refresh them with `npm run docs:reference:write`, never by hand.
- `scripts/inbound-links.json`: the URLs that released fallow versions link to, and the `moved` map for pages that moved.

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
- Verify facts against fallow `main`, not the latest release tag. Behavior in
  the "Unreleased" section of the fallow CHANGELOG can go live before the
  release.

### Page structure
- YAML frontmatter: `title`, `description`, `keywords`, `icon`.
- All code blocks need language tags.
- Each page has one page type. Follow its template, its line budget, its
  ending rule and the owner rule in [PAGE-TYPES.md](PAGE-TYPES.md).
- Use the terms in [TERMS.md](TERMS.md).

### Change rule
- A new option appears by regeneration.
- A concept page changes only when the concept changes.
- A new task gets a guide.

### Components
Tabs, Steps, Cards, CardGroup, Accordion, Info, Tip, Warning, Note, CodeGroup.
[PAGE-TYPES.md](PAGE-TYPES.md#components) lists every component that the
site renders, and when to use Tabs and Accordion.

## Content boundaries

- Document the public CLI, configuration, and integrations only.
- Do not document Rust internals.
- Never copy private repository content into this repository automatically.
- Private insights require a public rewrite and normal review in this repository.
- Keep `scripts/public-content.mjs` allowlisted. Do not package arbitrary
  directories or follow symlinks.

## Task completion

A task is done only when all of these are true:

- every pull request of the task is merged to `main`, and the CI of the
  merged commit is green;
- every companion pull request in another repository is merged;
- every follow-up that the work found is fixed, or has a GitHub issue that
  the final report links;
- the touched branches and worktrees are clean.

An open pull request is not done. This is also true while CI runs. A note in a
scratch file or in the chat report does not track a follow-up. When a merge is
blocked, report the pull request, the blocker, and the next action.

Sign each commit with `git commit -S -s`. The DCO check requires the sign-off.

## Write for the reader

Write code comments, docs, commit messages, PR text, and changelog entries
for a reader who did not see the session. Do not put the conversation, the
prompt, discarded attempts, or the edit history into them. Describe the code
as it is now. For a regression, state what breaks without the code, and link
the issue. `scripts/check-comment-quality.mjs` blocks narration and history
comments in the `.githooks/pre-commit` hook, the Documentation CI workflow,
and Claude edits.

## Verifying changes

Run the checks in [CONTRIBUTING.md](CONTRIBUTING.md#before-submitting).
