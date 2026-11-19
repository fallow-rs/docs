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
4. "Act on a finding". `analysis/similar-code.mdx` says "Act on a
   candidate", because a similar-code candidate is not a finding.
5. "Fail a run": the gates, or the reason why the analysis has none.
6. "What fallow cannot see": the limits of the analysis.
7. "Reference": links to the command reference and the config reference.

Each analysis page has these H2 headings, in this order, and no other H2
heading. Put an extra topic, such as the setup of the analysis, in an H3
section under the H2 that it belongs to.

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

## Fail a run

## What fallow cannot see

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
3. "Synopsis": a `cli-synopsis` block. See
   [Generated blocks](#generated-blocks).
4. "Options": a `cli-options` block. A command with subcommands also has a
   `cli-subcommands` block.
5. "Output": a sample and the fields of the machine output.
6. "Exit codes".
7. "Examples".
8. "Related": at most 3 links.

**Line budget.** None.

**Never on this page.** Concept text, tutorials, and advice on when to use
the command. The teaching page owns that text.

**The one exception.** `cli/security-agent-verification.mdx` is a protocol
page, not the page of one command. It stays in `cli/`, because released
fallow versions link to this path. Its sections, in this order:

1. One sentence: what the protocol joins.
2. A link to the teaching page.
3. "Steps": the numbered steps of the protocol.
4. "Input": the file that the protocol reads.
5. "Output": the file that the reviewer writes, and its fields.
6. "Result": what the join command gives.
7. "Finding identity": how the ids stay stable.
8. "Related": at most 3 links.

No other page in `cli/` may use this order.

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

1. A `rule <id>` block. The generator writes these sections in it from the
   explanation of the issue type: "What it reports", "Why it matters",
   "Example", "Fix" and "Facts". The facts table has the rows that the
   contract gives: issue type, SARIF rule id, command, default severity,
   config key (linked to its row in the config reference), filter option,
   suppression comment, fixable, opt-in and frameworks. The note of the
   issue type follows the table as a paragraph.
2. "When to keep the code": written by hand, below the block.

The page path is `rules/<issue type id>.mdx`, for example
`rules/unused-file.mdx`. The generator also owns the `title` (the
`display_label` of the issue type) and the `description` of the
frontmatter. It keeps the other frontmatter keys and
each line below the block.

**Line budget.** 80 lines.

**Never on this page.** The explanation of reachability or of another
concept (link to it), and the options of the command.

```mdx
---
title: "Unused files"
description: "Reference: File is not reachable from any entry point"
keywords: ["unused-file", "fallow/unused-file", "unused-files"]
icon: "skull-crossbones"
---

{/* generated:start rule unused-file */}

## What it reports

## Why it matters

## Example

## Fix

## Facts

{/* generated:end */}

## When to keep the code
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
| A new option, flag, config key, environment variable or exit code | Refresh `contracts/` and run `npm run docs:reference:write`. Do not add it to a teaching page. |
| A new output field | The command reference of that command. |
| A new issue type | Refresh `contracts/` and run `npm run docs:reference:write`. The generator writes the rule page. Add "When to keep the code". |
| A new concept | A new concept page in `concepts/`. |
| A new task for the user | A new guide in `guides/`. |
| A new analysis | A new analysis page in `analysis/`. |
| Changed behavior | The owner page of the behavior, and no other page. |

Describe the tool as it is. Never add version history, "now",
"previously", or roadmap text to a page. The changelog of the tool holds the
history.

## Generated blocks

The tool knows its options, config keys, exit codes, environment variables
and issue types. Nobody types these facts by hand.
`scripts/generate-reference.mjs` writes them from the two files in
`contracts/`. `contracts/README.md` tells how to refresh these files.

A generated block is a part of a page between two marker lines. The markers
are MDX comments, because an HTML comment breaks the site build:

```mdx
{/* generated:start cli-options dupes */}
{/* generated:end */}
```

Put each marker on its own line. Do not edit the text between the markers.
The generator replaces it and does not touch the rest of the page.

| Block | Argument | Content |
|:--|:--|:--|
| `cli-synopsis` | The command path, for example `dupes` or `coverage upload-inventory` | The usage line in a `bash` code block. |
| `cli-options` | The command path | The positionals, then the options without a group, then one heading and table for each option group (`help_heading` in the contract). A group heading is one level below the last heading before the block: `###` under `## Options`, `####` under a `### <subcommand>` section. Its explicit id is `options-<group>` for a top-level command, and `<subcommand>-options-<group>` for a subcommand, for example `analyze-options-input`. Global options and hidden options stay out. The last `cli-options` block of a page ends with one line that links each group of the global options. |
| `cli-subcommands` | The command path, or `fallow` for the list of all commands | One row for each subcommand. A row links to `/cli/<name>` for a top-level command, else to the heading `#<name>` on the same page. |
| `cli-global-options` | None | One heading and table for each group of global options, with the id `options-<group>`, for example `options-scope`. |
| `environment-variables` | Optional: one or more selectors, separated by spaces, for example `group:cache`, `FALLOW_COV` or `group:mcp !FALLOW_BIN`. A selector `group:<group>` matches the variables of one `group` of the contract. Any other selector is a name prefix. A selector after `!` excludes the variables that it matches. Without an including selector, the block starts from all variables. | The selected environment variables, with a "Default" column when a selected variable has a default. A selector that matches no variable stops the generator. On a page with more than one block, no variable can be in two blocks. On `configuration/environment.mdx`, and on a page with a block without an including selector, the blocks must together hold each variable. |
| `mcp-tools` | None | One row for each tool of the MCP server: name, description and CLI equivalent. |
| `mcp-resources` | None | One row for each resource of the MCP server: URI and content. |
| `rule` | The issue type id, for example `unused-file` | The generated sections of a rule page. |

Some rules of the generator decide how tool text looks on a page:

- An option description keeps the first two sentences of the help text. A
  later sentence that states a default stays too, for example "Defaults to
  `count` when omitted.", unless the "Default" column shows the default.
- A flag (`--name`, `--name=value`, a short flag between spaces), an
  environment variable (a name in capitals with an underscore, such as
  `FALLOW_BIN`) and a config or data file name (`package.json`) in tool
  text become code spans. Text in code, in a link or in a URL stays as it
  is.
- A rule example is prose. The generator writes it as a code block only
  when the contract fences it, or when it has more than one line and each
  line is code. A statement at the start of a prose example, such as
  `export const formatPrice = ...`, becomes one code span.

The generator also writes these files in full: `rules/<id>.mdx` (a new page,
or only the block and the `title` and `description` of a page that exists),
`reference/issue-types.mdx`, `reference/exit-codes.mdx`,
`reference/config.mdx`, the pages `reference/config-<area>.mdx` and
`scripts/rule-anchors.json`. The config reference has one page for each area,
because one page is longer than 50,000 characters.

- To write the blocks and the files, run `npm run docs:reference:write`.
  Add a path, for example `node scripts/generate-reference.mjs rules`, to
  write only the files under it.
- `npm run check` runs `npm run docs:reference`. It fails when a block or a
  file is not the same as the output of the generator.
- To see which command pages have which blocks, run
  `node scripts/generate-reference.mjs --report`.

An unknown command path, an unknown issue type, or a marker without a partner
stops the generator with the file and the line.

## Components

The site renders only these components: `Accordion`, `Card`, `CardGroup`,
`Check`, `CodeGroup`, `Icon`, `Info`, `Note`, `Step`, `Steps`, `Tab`, `Tabs`,
`Tip`, `Tooltip`, `Warning`. It also renders Markdown tables and plain JSX
HTML.

- Use `Tabs` only for equal alternatives, for example the package managers.
- Use `Accordion` only for optional depth.
- Never put a prerequisite, a limit, a warning or a default value inside a
  `Tab` or an `Accordion`. A reader who does not open it does not see it.

## Diagrams

The site renders a code block with the language `mermaid` as a picture. The
Markdown export keeps the source, so an agent reads it as text.

Use a diagram when the reader must see a structure that text gives only one
step at a time: the module graph, the path of a change through an audit, or a
decision with branches. Do not use a diagram to repeat a table or a list.

- Use `flowchart` (`flowchart LR` or `flowchart TD`), `sequenceDiagram` or
  `stateDiagram-v2`. The site does not render other types well.
- Give a diagram at most 11 nodes. A subgraph is a box around nodes and does
  not count.
- Put a label with special characters in quotes: `a["src/index.ts"]`. Keep
  labels short, because the layout does not wrap text. Aim for 4 words or
  fewer in each label.
- Do not put `*`, `_` or a backtick in a label. The renderer reads them as
  markup. Write `src/lib`, not `src/lib/**`.
- Give each node its label before an edge uses its id, on the line of the
  node or on an earlier line. The renderer keeps the first definition of a
  node, so a label on a later line does not show.
- Give a subgraph a short title: three words at most. A long title is wider
  than its box.
- Put at most 4 nodes in one row. A wide diagram shrinks the text. Use
  `flowchart TD` when a story has many steps side by side.
- Let the direction follow the story: from the top down or from left to
  right. Use at most one edge back to an earlier step.
- Do not use `style`, `classDef`, `class`, `linkStyle`, `:::` or `click`. The
  site sets the colors.
- Put at most two diagrams on a page.
- Put one sentence before the diagram that tells the reader what to look at.
  The text around the diagram names the same facts, so that a reader who
  cannot see the picture misses nothing.

The `diagram` check enforces the type, the node limit, the styling rule, the
limit of two diagrams, the label order, the markup characters in a label and
the length of a subgraph title.

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
| `history-text` | No version history or roadmap wording outside code. The check skips generated blocks: the text in a block comes from the tool, so fix the wording in the tool. |
| `hidden-content` | No `Warning`, `Note`, `Info` or requirement inside an `Accordion` or a `Tab`. |
| `frontmatter` | `title` and `description` exist, the page uses only the allowed keys, and the description has at most 160 characters and differs from the title. |
| `components` | Only the components that the site renders. |
| `ending` | No card grid after the last H2, and at most 3 links under "Next", "Reference" or "Related". Tutorial, concept, analysis, guide and rule pages only. |
| `em-dash` | No em dash outside code. |
| `bare-flag` | No long flag such as `--quiet` outside code, link targets, URLs and MDX comments, also in the description. The site font joins its two hyphens into one dash. Write the flag in backticks. |
| `mdx-syntax` | No text that stops the MDX build of the site. Outside code blocks, code spans, MDX comments and escapes, a `<` must start a known component or HTML tag, a closing tag or an autolink. A `{` or `}` must be part of an MDX comment, an explicit heading id or an attribute of a tag (`cols={2}`). Each known tag closes, and no line starts with `import` or `export`. Table cells and link text count as prose. Write the text in backticks, or escape it as `\<` or `\{`. |
| `diagram` | Each `mermaid` block is a `flowchart`, a `sequenceDiagram` or a `stateDiagram-v2`, has at most 11 nodes, and sets no style, class or click action. A page has at most two diagrams. In a flowchart, no edge uses a node id before a later line gives the node its label, no label has `*`, `_` or a backtick, and no subgraph title has more than three words. The node count includes each name outside quotes, shapes and edge labels, so it is never too low. See [Diagrams](#diagrams). |
| `inbound-links` | Each entry of `scripts/inbound-links.json` resolves to a page and to an explicit heading id. |

Pages that existed before a rule can break it. The baseline
`scripts/check-pages.baseline.json` records these violations for each rule
and each file: a count, or a size ceiling for `page-size`. The ceiling is the
size of the page plus 5 percent, so a small correction to a large page passes.
A file may not get worse than its baseline. A file without an entry must pass.

- When you fix a violation, run
  `node scripts/check-pages.mjs --update-baseline`. The check fails until
  the baseline matches.
- The update refuses to raise a number. Add `--allow-regression` only when
  you accept a new violation on purpose.
- When a page moves, add its old path to `moved` in
  `scripts/inbound-links.json` if a released link points to it.
