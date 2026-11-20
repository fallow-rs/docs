# Terms

This file lists the terms of the fallow docs. It is a repository file. The
site does not publish it.

Use one term for one thing. Use the term in the first column, with the
meaning in the second column. Define the term on its owner page, in bold,
once. Other pages link to the owner page at the first use. Do not use the
words in the last column for the same thing.

The owner pages are slugs in the page-type directories of `PAGE-TYPES.md`.
Some of them do not exist yet. Until they exist, link to the page that
explains the term today.

## Terms to use

| Term | Definition | Owner page | Do not use |
|:--|:--|:--|:--|
| entry point | A file that something outside your source code runs or loads, for example Node.js, a bundler, a test runner or a framework. | `concepts/entry-points` | root file, start file, main file (for the concept) |
| reachable | A file is reachable when fallow can follow imports to it from an entry point. | `concepts/entry-points` | live, alive, connected, used (for files) |
| unused file | A file that no entry point reaches. | `rules/unused-file` | dead file, orphan file, unreachable module |
| unused export | An export of a reachable file that no reachable file uses. | `rules/unused-export` | dead export, orphan export, unused symbol |
| barrel file | A file that exports names from other files again. | `concepts/entry-points` | index file (for the concept), re-export hub, facade |
| plugin | The part of fallow that knows one framework or tool. Fallow turns it on when the project depends on that package. | `concepts/plugins` | preset, integration, adapter, framework support |
| finding | One problem that fallow reports at one place: a file, a line, a name or a package. | `concepts/findings` | issue (for one problem), result, error, warning, violation |
| issue type | The kind of a finding, for example `unused-files` or `unused-exports`. Each finding has one issue type. | `concepts/findings` | check, category, finding type, rule (for the kind) |
| rule | The entry in the `rules` config that sets the severity of one issue type. | `concepts/findings` | lint rule, policy, check |
| severity | The level that a rule gives an issue type: `error`, `warn` or `off`. | `concepts/findings` | level, priority, importance |
| gate | A condition that makes a command exit with code 1, for example a threshold or `--fail-on-issues`. | `concepts/findings` | blocker, guard, CI check, quality gate |
| baseline | A saved file of the current findings. With it, fallow reports only the findings that the file does not hold. | `concepts/changed-code` | snapshot, allowlist, ignore file |
| clone group | One block of code that exists in two or more places. | `analysis/duplication` | clone, duplicate, copy, code clone |
| instance | One place that holds the code of a clone group. | `analysis/duplication` | copy, occurrence, duplicate, clone |
| clone family | A set of clone groups in the same set of files. | `analysis/duplication` | cluster, clone set, group of groups |
| handle | The stable name of one clone group, for example `dup:f42424e8`. Use it to inspect or accept the group. | `analysis/duplication` | ID, hash, fingerprint (in prose; `fingerprint` stays as the JSON field) |
| production mode | A run with `--production`: fallow leaves out test files and development tools, and checks only the code that ships. | `concepts/production-mode` | prod mode, release mode, runtime mode |
| workspace | One package of a monorepo, as the workspace patterns of the package manager declare it. | `concepts/workspaces` | project, sub-project, module, app (for the package) |
| config file | The file that holds the fallow settings, for example `.fallowrc.json`, `.fallowrc.jsonc` or `fallow.toml`. | `configuration/overview` | config, settings file, rc file, fallowrc (in prose) |
| changed-code check | A run of `fallow audit`: the analyses on the files that a change touches, with one verdict. | `concepts/changed-code` | PR check, diff check, incremental analysis, audit mode |
| verdict | The result of a changed-code check: `pass`, `warn` or `fail`. | `concepts/changed-code` | status, outcome, result, grade |
| audit gate | The findings that count for the verdict of a changed-code check, set with `--gate` or `audit.gate`: `new-only` (the default) or `all`. | `concepts/changed-code` | audit scope (the `Audit scope` line of the output names the changed files and the base), gate mode |
| coding agent | A program that edits the code of a project on request, for example Claude Code, Codex or Cursor. | `start/first-agent` | AI agent, assistant, harness (in prose; `harness` stays as an output value) |
| commit gate | The hook that runs `fallow audit` before a coding agent commits or pushes, and blocks the command on the verdict `fail`. | `integrations/claude-hooks` | agent gate, pre-commit gate, commit hook |
| health score | One number from 0 to 100 for the quality of the whole project. Higher is better. | `analysis/health` | quality score, grade, rating |
| maintainability index | A number from 0 to 100 for one file, from its complexity density, its unused code and its imports. Higher is better. Short form: MI. | `analysis/health` | maintainability score, MI score, health index |
| cyclomatic complexity | The number of paths through a function. | `analysis/health` | complexity (alone), McCabe score, branch count |
| cognitive complexity | An estimate of how hard a function is to read. Nested code counts more. | `analysis/health` | readability score, mental complexity |
| CRAP | A score that combines the complexity of a function with its test coverage. A complex function without tests gets a high score. | `analysis/health` | risk score, untested complexity (for the score) |
| type-aware analysis | An opt-in analysis that uses the TypeScript type checker to confirm what syntax alone cannot decide. | `analysis/type-aware` | type-aware mode, typed mode, TypeScript mode, semantic mode |
| runtime coverage | Data about the functions that ran in a deployed app with real traffic. Fallow merges it into the health report. | `analysis/runtime-coverage` | production coverage, live coverage, runtime data |

## Internal names

These names come from the implementation of fallow. Never use them on a
public page. Describe what the reader sees instead.

| Internal name | Say instead |
|:--|:--|
| sidecar | type-aware analysis, or "a separate process that runs the type checker" |
| companion (process or binary) | the name of the feature that the reader turns on |
| bincode | cache file |
| rayon | parallel analysis, or nothing |
| Tarjan, strongly connected components | circular dependency, cycle |
| suffix array, suffix tree | nothing: say what fallow compares ("sequences of tokens") |
| extract, resolve, graph (as pipeline stages) | "fallow reads each file and follows its imports" |
| crate names (`fallow-core`, `fallow-graph` and others) | fallow |
| `ModuleGraph`, `FileId`, `ExportId` and other type names | the module graph, a file, an export |
| oxc | parser, or nothing |
| issue registry, `issue_meta` | issue type |

A public page can name a technical method once, when a reader needs it to
judge a result. Explain it in plain words in the same sentence.
