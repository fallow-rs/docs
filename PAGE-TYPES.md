# Page types

This file defines the six types of pages in the fallow docs. It is a
repository file. The site does not publish it.

Each page has one type. The directory of the page sets its type, because the
site accepts only these frontmatter keys: `title`, `description`, `keywords`,
`icon`, `sidebarTitle` and `mode`. A page cannot declare its type.

`npm run check` runs `scripts/check-pages.mjs`, which checks the rules in this
file. [Checks](#checks) lists what each check enforces.

## Summary

| Type | Directory | Line budget |
|:--|:--|:--|
| Tutorial | `quickstart.mdx`, `start/` | 150 lines |
| Concept | `concepts/` | 200 lines |
| Analysis | `analysis/` | 250 lines |
| Guide | `guides/` | 200 lines |
| Command reference | `cli/` | None |
| Rule reference | `rules/` | 80 lines |

The line budget counts every line of the file, also the frontmatter. Each
page also has a hard limit of 50,000 characters.

A page in another directory has no page type. The generic rules apply to it:
links, navigation, frontmatter, components, size, history text, hidden
content and em dashes. The `reference/` directory holds generated reference
for configuration, output formats and other contracts. It follows the rules
of the command reference. The pages under `cloud/` are served on another
host. Only the generic rules apply to them.

A page path has at most two segments (`dir/page`). The navigation in
`docs.json` is a flat list of page strings in each group.

## Tutorial

**Purpose.** The reader gets a first result with fallow in one sitting.

**Directory.** `quickstart.mdx` and `start/`.

**Sections, in this order.**

1. An opening paragraph: what the reader gets from the page.
2. "Before you start": what the reader must have or do first.
3. The task steps. Each step that runs a command shows the real output.
4. "What you learned": 3 to 5 short points.
5. "Next": one link, or at most 3.

**Line budget.** 150 lines.

**Never on this page.** A concept explanation longer than two sentences
(link to the concept page), an options table, a choice between equal
methods, and a limit or an edge case that the first run does not hit.

```mdx
---
title: "Fix your first findings"
description: "Pick one finding from the report, check it, remove it, and run fallow again."
icon: "broom"
---

Opening paragraph.

## Before you start

## Pick one finding

## Check the finding

## Remove the code

## Run fallow again

## What you learned

## Next
```

## Concept

**Purpose.** The reader learns one idea that the analyses depend on, and can
predict the result of fallow.

**Directory.** `concepts/`.

**Sections, in this order.**

1. An opening paragraph: the idea in one or two sentences, and why it
   matters to the reader.
2. The problem in one example.
3. The definitions. Write each defined term in bold once, at its definition.
4. How fallow applies the idea.
5. What fallow cannot do.
6. "Next": at most 3 links.

**Line budget.** 200 lines.

**Never on this page.** Task steps (link to a guide), options tables (link
to the reference), output fields, and the details of one analysis.

```mdx
---
title: "Entry points and reachability"
description: "How fallow decides that a file or an export is used: it starts at the entry points and follows each import."
icon: "diagram-project"
---

Opening paragraph.

## The problem

## Entry points

## Reachability

## What fallow cannot follow

## Next
```

## Analysis

**Purpose.** The reader learns what one analysis finds, how fallow decides,
and what to do with each finding.

**Directory.** `analysis/`.

**Sections, in this order.**

1. An opening paragraph: the problem that the analysis finds, and the
   command that runs it.
2. "What fallow finds": real output, and a table that explains each part of
   it.
3. "How fallow decides".
4. "Act on a finding".
5. "Set a limit": the gates. Only when the analysis has a gate.
6. "Limits".
7. "Reference": links to the command reference and the config reference.

**Line budget.** 250 lines.

**Never on this page.** The full option list (link to the command
reference), JSON field lists, each config key, and the definition of a term
that a concept page owns.

```mdx
---
title: "Duplication"
description: "Find duplicated code with fallow dupes, decide which copies to merge, and set a limit for new copies."
icon: "clone"
---

Opening paragraph.

## What fallow finds

## How fallow decides

## Act on a finding

## Set a limit

## Limits

## Reference
```

## Guide

**Purpose.** The reader completes one task in a project.

**Directory.** `guides/`.

**Sections, in this order.**

1. A goal sentence: the result of the task.
2. "Before you start".
3. Numbered steps. Each step has one action.
4. "Check the result": a command and its expected output.
5. "If it fails": the usual causes and their fixes.

**Line budget.** 200 lines.

**Never on this page.** A second task, the explanation of a concept (link to
it), and a list of all options.

```mdx
---
title: "Set a baseline"
description: "Save the current findings, so that fallow fails a run only on new findings."
icon: "flag"
---

Goal sentence.

## Before you start

## Steps

## Check the result

## If it fails
```

## Command reference

**Purpose.** The reader finds the exact syntax, options, output and exit
codes of one command.

**Directory.** `cli/`.

**Sections, in this order.**

1. One sentence: the purpose of the command.
2. A link to the teaching page: the analysis, concept or guide page.
3. "Synopsis".
4. "Options": a generated block between the markers
   `{/* generated:start cli-options <command> */}` and `{/* generated:end */}`.
   Do not edit the block by hand.
5. "Output": a sample and the fields of the machine output.
6. "Exit codes".
7. "Examples".
8. "Related": at most 3 links.

**Line budget.** None.

**Never on this page.** Concept text, tutorials, and advice on when to use
the command. The teaching page owns that text.

```mdx
---
title: "fallow dupes"
description: "Options, output fields and exit codes of fallow dupes."
icon: "clone"
---

One sentence.

Link to the teaching page.

## Synopsis

## Options

## Output

## Exit codes

## Examples

## Related
```

## Rule reference

**Purpose.** The reader learns what one issue type reports and how to act on
one finding of it. Tool output links to these pages.

**Directory.** `rules/`.

**Sections, in this order.**

1. What it reports.
2. Why it matters.
3. Example: code that fallow reports.
4. When to keep the code.
5. Fix.
6. A facts table with these rows: default severity, config key, filter
   option, suppression comment, fixable.

**Line budget.** 80 lines.

**Never on this page.** The explanation of reachability or of another
concept (link to it), and the options of the command.

```mdx
---
title: "unused-files"
description: "A file that no entry point reaches. What it means, when to keep it, and how to fix it."
icon: "file-xmark"
---

## What it reports

## Why it matters

## Example

## When to keep the code

## Fix

## Facts
```

## Owner rule

Each fact has one owner page: a term, an option, a config key, an exit code,
an output field, a default value or a limit. Write the fact on its owner page
only. Other pages link to the owner page and do not restate the fact.

- A term: the concept page that defines it. `TERMS.md` names the owner of
  each term.
- An option, an exit code or an output field: the command reference.
- A config key and its default: the configuration reference.
- A task: one guide.

When a teaching page needs a fact, it links to the owner at the first use.

## Placement

Use this table when you change the tool and must update the docs.

| Change in the tool | Page that changes |
|:--|:--|
| A new option, flag or config key | Regenerate the reference. Do not add it to a teaching page. |
| A new output field or exit code | The command reference of that command. |
| A new issue type | A new rule reference page in `rules/`. |
| A new concept | A new concept page in `concepts/`. |
| A new task for the user | A new guide in `guides/`. |
| A new analysis | A new analysis page in `analysis/`. |
| Changed behavior | The owner page of the behavior, and no other page. |

Describe the tool as it is. Never add version history, "now",
"previously", or roadmap text to a page. The changelog of the tool holds the
history.

## Components

The site renders only these components: `Accordion`, `Card`, `CardGroup`,
`Check`, `CodeGroup`, `Icon`, `Info`, `Note`, `Step`, `Steps`, `Tab`, `Tabs`,
`Tip`, `Tooltip`, `Warning`. It also renders Markdown tables and plain JSX
HTML.

- Use `Tabs` only for equal alternatives, for example the package managers.
- Use `Accordion` only for optional depth.
- Never put a prerequisite, a limit, a warning or a default value inside a
  `Tab` or an `Accordion`. A reader who does not open it does not see it.

## Ending

A page ends with at most 3 links, in a list under "Next", "Reference" or
"Related". Do not end a page with a card grid.

## Explicit anchors

The tool, the GitHub Action, the editor extension, the npm READMEs and the
skills link to headings of these pages. Give each heading that the tool or
another site links to an explicit id:

```mdx
## Unused files {#unused-files}
```

Without an explicit id, the site makes the id from the heading text. A new
heading text then breaks each released link to it.
`scripts/inbound-links.json` lists the links from released versions.

## Output samples

A line of tool output on a page is verbatim. To shorten a sample, remove
whole lines. Do not edit, merge or invent a line.

## Checks

`scripts/check-pages.mjs` reports each violation as
`path:line: [rule-id] message`.

| Rule | Checks |
|:--|:--|
| `link-target` | Each internal link points to a page, and each anchor to a heading on that page. |
| `nav-complete` | `docs.json` lists each page once, and each listed page exists. |
| `page-size` | The line budget of the page type, and 50,000 characters for each page. |
| `history-text` | No version history or roadmap wording outside code. |
| `hidden-content` | No `Warning`, `Note`, `Info` or requirement inside an `Accordion` or a `Tab`. |
| `frontmatter` | `title` and `description` exist, the page uses only the allowed keys, and the description has at most 160 characters and differs from the title. |
| `components` | Only the components that the site renders. |
| `ending` | No card grid after the last H2, and at most 3 links under "Next", "Reference" or "Related". Tutorial, concept, analysis, guide and rule pages only. |
| `em-dash` | No em dash outside code. |
| `inbound-links` | Each entry of `scripts/inbound-links.json` resolves to a page and to an explicit heading id. |

Pages that existed before a rule can break it. The baseline
`scripts/check-pages.baseline.json` records these violations for each rule
and each file: a count, or a size for `page-size`. A file may not get worse
than its baseline. A file without an entry must pass.

- When you fix a violation, run
  `node scripts/check-pages.mjs --update-baseline`. The check fails until
  the baseline matches.
- The update refuses to raise a number. Add `--allow-regression` only when
  you accept a new violation on purpose.
- When a page moves, add its old path to `moved` in
  `scripts/inbound-links.json` if a released link points to it.
