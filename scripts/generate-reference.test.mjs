import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ANCHOR_FILE,
  CLI_CONTRACT,
  ENVIRONMENT_PAGE,
  CONFIG_CONTRACT,
  END,
  PAGE_CHARACTER_LIMIT,
  RULE_LINE_BUDGET,
  buildGeneratedFiles,
  buildRuleAnchors,
  checkEnvironmentBlocks,
  cleanToolText,
  coverageRows,
  cutAtWord,
  defaultSentences,
  describeArgument,
  describeSchema,
  escapeCell,
  escapeParagraph,
  escapeProse,
  findBlocks,
  firstSentences,
  headingLevelBefore,
  indexCommands,
  indexSummary,
  isCodeExample,
  isMainBuild,
  leadingCode,
  optionIdPrefix,
  overBudgetRules,
  parseArguments,
  renderBlock,
  renderCliOptions,
  renderCliSubcommands,
  renderCliSynopsis,
  renderConfigPages,
  renderDoc,
  renderEnvironment,
  renderExitCodes,
  renderGlobalNote,
  renderGlobalOptions,
  renderMcpResources,
  renderMcpTools,
  renderContractReadme,
  renderPageBlocks,
  renderRule,
  replaceBlocks,
  replaceDashes,
  ruleDescription,
  wrapSourcePaths,
  ruleTitle,
  selectEnvironment,
  sentenceCase,
  singular,
  splitSentences,
  startMarker,
  teachingPage,
  updateRulePage,
} from "./generate-reference.mjs";
import { collectHeadings, findBareMdx } from "./mdx-source.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (path) => JSON.parse(readFileSync(resolve(ROOT, path), "utf8"));
const CONTRACT = readJson(CLI_CONTRACT);
const SCHEMA = readJson(CONFIG_CONTRACT);
const INBOUND = readJson("scripts/inbound-links.json");
const EM_DASH = String.fromCodePoint(0x2014);

// ---------------------------------------------------------------------------
// Text

test("removes rustdoc links and turns autolinks into Markdown links", () => {
  assert.equal(cleanToolText("Legacy spelling for [`EmailMode::Anonymized`]."), "Legacy spelling for `EmailMode::Anonymized`.");
  assert.equal(cleanToolText("See [`docs`](/x) and [`a`][ref]."), "See [`docs`](/x) and [`a`][ref].");
  assert.equal(cleanToolText("See <https://example.com/a#b> for more."), "See [https://example.com/a#b](https://example.com/a#b) for more.");
  assert.equal(cleanToolText("Keep `<https://example.com>` in code."), "Keep `<https://example.com>` in code.");
  assert.equal(escapeProse("Use <https://example.com>, not <PATH>."), "Use [https://example.com](https://example.com), not `<PATH>`.");
});

test("writes a Title Case name in sentence case and keeps acronyms and proper names", () => {
  assert.equal(sentenceCase("High Cognitive Complexity"), "High cognitive complexity");
  assert.equal(sentenceCase("High CRAP Score"), "High CRAP score");
  assert.equal(sentenceCase("High Complexity (Both)"), "High complexity (both)");
  assert.equal(sentenceCase("Test-Only Branches"), "Test-only branches");
  assert.equal(sentenceCase("Unused Svelte Events"), "Unused Svelte events");
  assert.equal(sentenceCase("Server-side request forgery sink"), "Server-side request forgery sink");
  assert.equal(sentenceCase("JWT alg none"), "JWT alg none");
  assert.equal(ruleTitle({ id: "x", label: "CSS Token Drift" }), "CSS token drift");
  assert.equal(ruleTitle({ id: "x", summary_label: "Unused Files kept", label: "Unused Files" }), "Unused Files kept");
  const summary = CONTRACT.issue_types.find((issue) => issue.id === "css-token-drift").explanation.summary;
  assert.doesNotMatch(summary, /\.$/u);
  assert.ok(renderRule(CONTRACT, "css-token-drift").includes(`## What it reports\n\n${summary}.\n`));
});

test("keeps the text before the list of a long config index summary", () => {
  const list = Array.from({ length: 40 }, (_, index) => `\`key${index}\` (default ${index})`).join(", ");
  assert.equal(indexSummary(`Configures clone detection: ${list}.`), "Configures clone detection.");
  assert.equal(indexSummary(`Sets limits for \`a: b\` (x): ${list}.`), "Sets limits for `a: b` (x).");
  assert.equal(indexSummary("A short summary: with a colon."), "A short summary: with a colon.");
  const long = `A long summary without a colon ${"word ".repeat(80)}end.`;
  assert.equal(indexSummary(long), long);
});

test("replaces an em dash and a spaced double hyphen with a comma", () => {
  assert.equal(replaceDashes(`fast ${EM_DASH} and small`), "fast, and small");
  assert.equal(replaceDashes(`fast${EM_DASH}small`), "fast, small");
  assert.equal(replaceDashes("Default mode -- equivalent to strict"), "Default mode, equivalent to strict");
  assert.equal(replaceDashes("use `a -- b` and --flag"), "use `a -- b` and --flag");
  assert.equal(replaceDashes(`one, ${EM_DASH} two`), "one, two");
});

test("escapes nasty help text for MDX prose", () => {
  const nasty = "Read <PATH> or {a,b} with `x | y`, $VAR, src/*.ts and <div class=\"x\"> a < b";
  const escaped = escapeProse(nasty);
  assert.equal(escaped, "Read `<PATH>` or \\{a,b\\} with `x | y`, $VAR, src/\\*.ts and `<div class=\"x\">` a \\< b");
  assert.deepEqual(findBareMdx(escaped), []);
  assert.equal(escapeProse("keep `{a}` and `<b>`"), "keep `{a}` and `<b>`");
  assert.equal(escapeProse("a C:\\{path"), "a C:\\\\\\{path");
});

test("writes a fallow:// URI as one code span, without the sentence punctuation", () => {
  assert.equal(
    escapeProse("Read the fallow://explain/{issue_type} URI, or fallow://tools."),
    "Read the `fallow://explain/{issue_type}` URI, or `fallow://tools`.",
  );
  assert.equal(escapeProse("keep `fallow://tools` as it is"), "keep `fallow://tools` as it is");
});

test("writes a bare flag, an environment variable and a file name of tool text as code", () => {
  assert.equal(escapeProse("Skip with --no-package-baselines."), "Skip with `--no-package-baselines`.");
  assert.equal(escapeProse("Pass --format=json or --top=10, then -q."), "Pass `--format=json` or `--top=10`, then `-q`.");
  assert.equal(escapeProse("Implies --trend and --score"), "Implies `--trend` and `--score`");
  assert.equal(escapeProse("(alias: --output)"), "(alias: `--output`)");
  assert.equal(escapeProse("Set FALLOW_BIN, or FALLOW_* in CI."), "Set `FALLOW_BIN`, or `FALLOW_*` in CI.");
  assert.equal(escapeProse("a NODE_V8_COVERAGE directory"), "a `NODE_V8_COVERAGE` directory");
  assert.equal(escapeProse("when no --base/--changed-since is passed"), "when no `--base`/`--changed-since` is passed");
  assert.equal(escapeProse("Reads package.json and .fallowrc.jsonc."), "Reads `package.json` and `.fallowrc.jsonc`.");
});

test("keeps code spans, links, URLs, negative numbers, hyphenated words and a bare double hyphen as they are", () => {
  assert.equal(escapeProse("keep `--quiet` and `FALLOW_BIN`"), "keep `--quiet` and `FALLOW_BIN`");
  assert.equal(escapeProse("See [the --quiet flag](/cli/global-flags#quiet)."), "See [the --quiet flag](/cli/global-flags#quiet).");
  assert.equal(escapeProse("See https://example.com/a--b/x.json now"), "See https://example.com/a--b/x.json now");
  assert.equal(escapeProse("A delta of -5 or -0.5 is a re-export of e-mail."), "A delta of -5 or -0.5 is a re-export of e-mail.");
  assert.equal(escapeProse("a--b and x -- y"), "a--b and x, y");
  assert.equal(escapeProse("Run -- then"), "Run, then");
  assert.equal(escapeProse("src/data.json.ts, a/b--c, CI and V8"), "src/data.json.ts, a/b--c, CI and V8");
});

test("escapes a table cell: one line and each pipe, also in code", () => {
  assert.equal(escapeCell("a | b\nc `x|y`"), "a \\| b c `x\\|y`");
});

test("escapes the start of a paragraph that MDX reads as a module or a block", () => {
  assert.equal(escapeParagraph("export function a() is unused."), "`export function a()` is unused.");
  assert.equal(escapeParagraph("export is a keyword."), "`export` is a keyword.");
  assert.equal(escapeParagraph("# not a heading"), "\\# not a heading");
  assert.equal(escapeParagraph("- not a list"), "\\- not a list");
});

test("splits sentences outside code spans and abbreviations", () => {
  assert.deepEqual(splitSentences("One (e.g. `a. B`). Two. Three"), ["One (e.g. `a. B`).", "Two.", "Three"]);
  assert.deepEqual(splitSentences("Use `x.` Then y."), ["Use `x.` Then y."]);
});

test("keeps the first two sentences and a parenthesized default after them", () => {
  assert.equal(firstSentences("One. Two. (defaults to `5`) Three."), "One. Two. (defaults to `5`)");
  assert.equal(firstSentences("No period here\n\nSecond paragraph. Third."), "No period here. Second paragraph.");
  assert.equal(firstSentences("Only one"), "Only one");
});

test("cuts a description at a word boundary", () => {
  assert.equal(cutAtWord("one two three", 9), "one two");
  assert.equal(cutAtWord("short", 9), "short");
  const long = ruleDescription({ id: "x".repeat(200), command: "dead-code" });
  assert.ok(long.length <= 160);
});

test("gives each rule page a plain description that names the issue type and its command, not the summary", () => {
  const unused = { id: "unused-file", command: "dead-code", explanation: { summary: "File is not reachable from any entry point" } };
  assert.equal(ruleDescription(unused), "What an unused-file finding of fallow dead-code means, why it matters and how to fix it.");
  assert.equal(ruleDescription({ id: "high-crap-score" }), "What a high-crap-score finding means, why it matters and how to fix it.");
  const descriptions = CONTRACT.issue_types.map((issue) => ruleDescription(issue));
  assert.equal(new Set(descriptions).size, descriptions.length);
  for (const [index, description] of descriptions.entries()) {
    assert.ok(description.length <= 160, description);
    assert.ok(!description.startsWith("Reference:"), description);
    assert.notEqual(description, CONTRACT.issue_types[index].explanation?.summary);
  }
});

test("writes a file path of a prose rule example as code", () => {
  assert.equal(
    wrapSourcePaths("src/old-widget.ts is not imported by any entry point, route, or config file."),
    "`src/old-widget.ts` is not imported by any entry point, route, or config file.",
  );
  assert.equal(wrapSourcePaths("Both ./a/b.tsx and @scope/pkg/index.mjs."), "Both `./a/b.tsx` and `@scope/pkg/index.mjs`.");
  assert.equal(wrapSourcePaths("keep `src/a.ts`, index.ts, src/data and a/b.tsv"), "keep `src/a.ts`, index.ts, src/data and a/b.tsv");
});

test("renders a doc comment: joined paragraphs, kept fences, headings as bold lines", () => {
  const doc = "First line\nsecond line.\n\n# Examples\n\n```json\n{ \"a\": 1 }\n```\n- item one\n  continued\n- item two";
  assert.equal(renderDoc(doc), "First line second line.\n\n**Examples**\n\n```json\n{ \"a\": 1 }\n```\n\n- item one continued\n- item two");
});

// ---------------------------------------------------------------------------
// Markers

const fakeRender = (block) => `[${block.type} ${block.argument}]`;

test("replaces only the content between the markers", () => {
  const text = `# Title\n\n${startMarker("cli-options", "dupes")}\nold\ncontent\n${END}\n\nAfter.\n`;
  const result = replaceBlocks(text, fakeRender, "cli/dupes.mdx");
  assert.equal(result, `# Title\n\n${startMarker("cli-options", "dupes")}\n\n[cli-options dupes]\n\n${END}\n\nAfter.\n`);
  assert.equal(replaceBlocks(result, fakeRender, "cli/dupes.mdx"), result);
});

test("keeps CRLF line endings and the text outside the block", () => {
  const text = `a\r\n${startMarker("cli-synopsis", "dupes")}\r\nold\r\n${END}\r\nb\r\n`;
  const result = replaceBlocks(text, () => "x\ny", "page.mdx");
  assert.equal(result, `a\r\n${startMarker("cli-synopsis", "dupes")}\r\n\r\nx\r\ny\r\n\r\n${END}\r\nb\r\n`);
  assert.equal(replaceBlocks(result, () => "x\ny", "page.mdx"), result);
});

test("handles a block at the end of the file without a final newline", () => {
  const text = `a\n${startMarker("cli-global-options")}\n${END}`;
  const result = replaceBlocks(text, () => "x", "page.mdx");
  assert.equal(result, `a\n${startMarker("cli-global-options")}\n\nx\n\n${END}`);
});

test("names the file and the line of a broken marker", () => {
  assert.throws(() => findBlocks(`a\n${startMarker("rule", "x")}\nb\n`, "rules/x.mdx"), /rules\/x\.mdx:2: .*has no/u);
  assert.throws(() => findBlocks(`a\n${END}\n`, "p.mdx"), /p\.mdx:2: .*has no start marker/u);
  assert.throws(
    () => findBlocks(`${startMarker("rule", "a")}\n${startMarker("rule", "b")}\n${END}\n${END}\n`, "p.mdx"),
    /p\.mdx:2: a generated block opens inside the block of line 1/u,
  );
  assert.throws(() => findBlocks("{/* generated:start */}\n", "p.mdx"), /p\.mdx:1: the generated marker is malformed/u);
});

test("names the file and the line of an unknown command or block type", () => {
  const render = (block) => renderBlock(CONTRACT, block);
  assert.throws(() => replaceBlocks(`x\n\n${startMarker("cli-options", "no-such-command")}\n${END}\n`, render, "cli/x.mdx"), /cli\/x\.mdx:3: The contract has no command "no-such-command"/u);
  assert.throws(() => replaceBlocks(`${startMarker("cli-unknown", "dupes")}\n${END}\n`, render, "cli/x.mdx"), /cli\/x\.mdx:1: Unknown generated block type/u);
  assert.throws(() => replaceBlocks(`${startMarker("cli-options")}\n${END}\n`, render, "cli/x.mdx"), /needs an argument/u);
});

// ---------------------------------------------------------------------------
// Command blocks

const option = (fields) => ({
  short: null,
  value_name: null,
  default: null,
  possible_values: [],
  help: null,
  long_help: null,
  hidden: false,
  global: false,
  help_heading: null,
  negates: null,
  negated_by: null,
  aliases: [],
  action: "set-true",
  ...fields,
});

const FIXTURE = {
  about: "Root",
  usage: "fallow [OPTIONS] [COMMAND]",
  root_command: { options: [], positionals: [], exit_codes: [] },
  global_options: [
    option({ long: "--root", short: "-r", value_name: "ROOT", action: "set", help: "Project root", global: true }),
    option({ long: "--secret", hidden: true, global: true, help: "Hidden" }),
  ],
  commands: [
    {
      name: "demo",
      path: "demo",
      about: "Demo command. More text.",
      usage: "fallow demo [OPTIONS] <PATH>",
      hidden: false,
      exit_codes: [{ code: 9, name: "demo-gate", description: "A demo gate | failed" }],
      positionals: [{ id: "path", value_name: "PATH", multiple: true, required: true, help: "Files to read <PATH>", hidden: false, possible_values: [] }],
      options: [
        option({ long: "--mode", value_name: "MODE", action: "set", default: "fast", help: "How to run", possible_values: [{ name: "fast", hidden: false }, { name: "slow", aliases: ["lazy"], hidden: false }, { name: "secret", hidden: true }] }),
        option({ long: "--cache", negated_by: "--no-cache", help: "Use the cache. Second sentence. Third sentence." }),
        option({ long: "--no-cache", negates: "--cache", help: "Do not use the cache" }),
        option({ long: "--hidden", hidden: true, help: "Hidden" }),
        option({ long: "--root", global: true, help: "A global option" }),
        option({ long: "--top", value_name: "N", action: "set", help_heading: "Output", help: `Show N groups ${EM_DASH} {a,b}`, aliases: [{ name: "--limit", visible: true }, { name: "--max", visible: false }] }),
      ],
      subcommands: [
        { name: "run", path: "demo run", about: "Run it. Then more.", usage: "fallow demo run", hidden: false, options: [], positionals: [], exit_codes: [], subcommands: [] },
        { name: "ghost", path: "demo ghost", about: "Hidden", usage: "fallow demo ghost", hidden: true, options: [], positionals: [], exit_codes: [], subcommands: [] },
      ],
    },
  ],
  exit_codes: [{ code: 0, name: "success", description: "No gate failed" }],
  environment_variables: [
    { name: "FALLOW_FORMAT", description: "Default format <FORMAT>" },
    { name: "FALLOW_COV_TOKEN", description: "Token" },
  ],
  issue_types: [],
};

test("renders the options of a command: positionals, a pair row, help heading groups, no hidden or global option", () => {
  const block = renderCliOptions(FIXTURE, "demo");
  assert.equal(
    block,
    [
      "| Argument | Description |",
      "|:--|:--|",
      "| `<PATH...>` | Files to read `<PATH>` |",
      "",
      "| Option | Default | Description |",
      "|:--|:--|:--|",
      "| `--mode <MODE>` | `fast` | How to run. Values: `fast`, `slow` (alias `lazy`). |",
      "| `--cache`, `--no-cache` |  | Use the cache. Second sentence. |",
      "",
      "### Output {#options-output}",
      "",
      "| Option | Description |",
      "|:--|:--|",
      "| `--top <N>` (alias `--limit <N>`) | Show N groups, \\{a,b\\} |",
    ].join("\n"),
  );
  assert.deepEqual(findBareMdx(block), []);
});

test("renders the synopsis, the subcommands and the global options", () => {
  assert.equal(renderCliSynopsis(FIXTURE, "demo"), "```bash\nfallow demo [OPTIONS] <PATH>\n```");
  assert.equal(renderCliSubcommands(FIXTURE, "demo"), "| Subcommand | Description |\n|:--|:--|\n| [`run`](#run) | Run it. |");
  assert.match(renderCliSubcommands(FIXTURE, "fallow"), /\[`demo`\]\(\/cli\/demo\) \| Demo command\. \|/u);
  assert.throws(() => renderCliSubcommands(FIXTURE, "demo run"), /has no subcommands/u);
  assert.equal(renderGlobalOptions(FIXTURE), "| Option | Description |\n|:--|:--|\n| `-r, --root <ROOT>` | Project root |");
});

test("renders the environment variables, all or by name prefix", () => {
  assert.match(renderEnvironment(FIXTURE), /`FALLOW_FORMAT` \| Default format `<FORMAT>` \|/u);
  assert.doesNotMatch(renderEnvironment(FIXTURE, "FALLOW_COV"), /FALLOW_FORMAT/u);
  assert.throws(() => renderEnvironment(FIXTURE, "NOPE"), /No environment variable starts with "NOPE"/u);
});

test("selects environment variables by several prefixes and by excluded prefixes", () => {
  const names = (argument) => selectEnvironment(FIXTURE, argument).map((variable) => variable.name);
  assert.deepEqual(names("FALLOW_COV FALLOW_FORMAT"), ["FALLOW_FORMAT", "FALLOW_COV_TOKEN"]);
  assert.deepEqual(names("!FALLOW_COV"), ["FALLOW_FORMAT"]);
  assert.deepEqual(names("FALLOW_ !FALLOW_FORMAT"), ["FALLOW_COV_TOKEN"]);
  assert.throws(() => names("!FALLOW_GONE"), /No environment variable starts with "FALLOW_GONE"/u);
  assert.throws(() => names("!"), /No environment variable starts with ""/u);
  assert.throws(() => renderEnvironment(FIXTURE, "FALLOW_COV !FALLOW_COV_TOKEN"), /select no environment variable/u);
  assert.doesNotMatch(renderEnvironment(FIXTURE, "!FALLOW_COV"), /FALLOW_COV_TOKEN/u);
});

test("checks that the environment blocks of a page hold each variable once", () => {
  const page = (...arguments_) => arguments_.map((argument) => `${startMarker("environment-variables", argument)}\n${END}`).join("\n\n");
  assert.doesNotThrow(() => checkEnvironmentBlocks(FIXTURE, page("FALLOW_COV", "!FALLOW_COV"), "a.mdx"));
  assert.doesNotThrow(() => checkEnvironmentBlocks(FIXTURE, page("FALLOW_COV"), "a.mdx"));
  assert.throws(() => checkEnvironmentBlocks(FIXTURE, page("FALLOW_COV", ""), "a.mdx"), /a\.mdx:4: FALLOW_COV_TOKEN is also in the block on line 1/u);
  assert.throws(() => checkEnvironmentBlocks(FIXTURE, page("FALLOW_FORMAT", "!FALLOW_FORMAT !FALLOW_COV"), "a.mdx"), /a\.mdx:4: no block of the page holds FALLOW_COV_TOKEN/u);
});

test("renders the shared exit codes and the codes of each command", () => {
  const page = renderExitCodes(FIXTURE);
  assert.match(page, /## Shared exit codes \{#shared-exit-codes\}/u);
  assert.match(page, /### fallow demo \{#demo\}/u);
  assert.match(page, /`9` \| `demo-gate` \| A demo gate \\\| failed/u);
});

test("renders a block of every command of the real contract as safe MDX without an em dash", () => {
  for (const [path, command] of indexCommands(CONTRACT)) {
    const parts = [renderCliSynopsis(CONTRACT, path), renderCliOptions(CONTRACT, path)];
    if ((command.subcommands ?? []).some((sub) => !sub.hidden)) {
      parts.push(renderCliSubcommands(CONTRACT, path));
    }
    const text = parts.join("\n\n");
    assert.deepEqual(findBareMdx(text), [], path);
    assert.ok(!text.includes(EM_DASH), path);
  }
  for (const text of [renderGlobalOptions(CONTRACT), renderEnvironment(CONTRACT)]) {
    assert.deepEqual(findBareMdx(text), []);
    assert.ok(!text.includes(EM_DASH));
  }
});

test("lists the commands with their page and blocks", () => {
  const pages = new Map([["cli/demo.mdx", `${startMarker("cli-options", "demo")}\n${END}\n${startMarker("cli-subcommands", "demo")}\n${END}`]]);
  const rows = coverageRows(FIXTURE, (path) => pages.get(path));
  assert.deepEqual(rows[0], { command: "fallow", page: "missing", options: false, synopsis: false, subcommands: false });
  assert.deepEqual(rows[1], { command: "demo", page: "cli/demo.mdx", options: true, synopsis: false, subcommands: true });
  assert.deepEqual(rows[2], { command: "demo run", page: "cli/demo.mdx", options: false, synopsis: false, subcommands: null });
});

// ---------------------------------------------------------------------------
// Generated files

const generated = buildGeneratedFiles({ contract: CONTRACT, schema: SCHEMA, inbound: INBOUND });

test("generates the same bytes on each run", () => {
  const again = buildGeneratedFiles({ contract: CONTRACT, schema: SCHEMA, inbound: INBOUND });
  assert.deepEqual([...again.files], [...generated.files]);
});

test("each generated page is safe MDX, has no em dash and stays under the character limit", () => {
  for (const [path, text] of generated.files) {
    if (!path.endsWith(".mdx")) {
      continue;
    }
    assert.deepEqual(findBareMdx(text), [], path);
    assert.ok(!text.includes(EM_DASH), path);
    assert.ok(text.length <= PAGE_CHARACTER_LIMIT, `${path} has ${text.length} characters`);
  }
});

test("generates one rule page for each issue type, within the line budget", () => {
  const rules = [...generated.files.keys()].filter((path) => path.startsWith("rules/"));
  assert.equal(rules.length, CONTRACT.issue_types.length);
  assert.deepEqual(overBudgetRules(generated.files), []);
  for (const issue of CONTRACT.issue_types) {
    const text = generated.files.get(`rules/${issue.id}.mdx`);
    const description = text.match(/^description: (.*)$/mu)[1];
    assert.ok(JSON.parse(description).length <= 160, issue.id);
    assert.ok(text.split("\n").length <= RULE_LINE_BUDGET, issue.id);
  }
});

test("maps each issue type to a teaching page, and fails on an unknown category", () => {
  for (const issue of CONTRACT.issue_types) {
    assert.ok(teachingPage(issue).page.startsWith("/"), issue.id);
  }
  assert.throws(() => teachingPage({ id: "new-thing", category: "Unknown" }), /has no teaching page/u);
});

test("a rerun keeps the hand-written part of a rule page and the frontmatter it does not own", () => {
  const issue = CONTRACT.issue_types.find((entry) => entry.id === "unused-file");
  const page = generated.files.get("rules/unused-file.mdx");
  const edited = page
    .replace('icon: "skull-crossbones"', 'icon: "file"\nsidebarTitle: "Unused file"')
    .replace(/^title: .*$/mu, 'title: "Old title"')
    .replace("## Why it matters", "## Why it was edited")
    .concat("\n## When to keep the code\n\nKeep a file that a tool loads by name.\n");
  const result = updateRulePage(CONTRACT, issue, edited, "rules/unused-file.mdx", generated.config.link);
  assert.match(result, /^title: "Unused files"$/mu);
  assert.match(result, /^icon: "file"$/mu);
  assert.match(result, /^sidebarTitle: "Unused file"$/mu);
  assert.match(result, /## Why it matters/u);
  assert.ok(result.endsWith("## When to keep the code\n\nKeep a file that a tool loads by name.\n"));
  assert.equal(updateRulePage(CONTRACT, issue, result, "rules/unused-file.mdx", generated.config.link), result);
  assert.throws(() => updateRulePage(CONTRACT, issue, "---\ntitle: x\n---\n", "rules/unused-file.mdx", generated.config.link), /needs exactly one block/u);
});

test("the facts of a rule page link its config key to the config reference", () => {
  const page = generated.files.get("rules/unused-export.mdx");
  assert.match(page, /\| Config key in `rules` \| \[`unused-exports`\]\(\/reference\/config-rules#rules-unused-exports\) \|/u);
  assert.match(generated.files.get("reference/config-rules.mdx"), /\| <span id="rules-unused-exports"><\/span>`unused-exports` \|/u);
  assert.match(page, /\| Suppression comment \| `\/\/ fallow-ignore-next-line unused-export` \|/u);
});

test("the issue index lists each issue type once, sorted inside each category", () => {
  const index = generated.files.get("reference/issue-types.mdx");
  for (const issue of CONTRACT.issue_types) {
    assert.equal(index.split(`](/rules/${issue.id})`).length - 1, 1, issue.id);
  }
  const security = index.split("## Security")[1].split("\n## ")[0];
  const ids = [...security.matchAll(/\[`([\w-]+)`\]/gu)].map((match) => match[1]);
  assert.deepEqual(ids, [...ids].sort());
});

// ---------------------------------------------------------------------------
// Config reference

test("describes schema shapes: refs, optional, enums, arrays of objects and maps", () => {
  const schema = {
    $defs: {
      Mode: { oneOf: [{ const: "a", description: "First" }, { const: "b" }] },
      Item: { type: "object", properties: { name: { type: "string" } } },
    },
  };
  assert.deepEqual(describeSchema(schema, { anyOf: [{ $ref: "#/$defs/Mode" }, { type: "null" }] }).values, [
    { name: "a", description: "First" },
    { name: "b", description: null },
  ]);
  assert.equal(describeSchema(schema, { anyOf: [{ $ref: "#/$defs/Mode" }, { type: "null" }] }).optional, true);
  assert.equal(describeSchema(schema, { type: "array", items: { $ref: "#/$defs/Item" } }).type, "object[]");
  assert.equal(describeSchema(schema, { type: "object", additionalProperties: { type: "string" } }).type, "map of string");
  assert.equal(describeSchema(schema, { anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] }).type, "string or string[]");
  assert.equal(describeSchema(schema, { type: ["integer", "null"] }).optional, true);
});

test("each top-level config key has exactly one heading, with its key as id", () => {
  const pages = [...generated.files].filter(([path]) => /^reference\/config-.+\.mdx$/u.test(path));
  const headings = pages.flatMap(([, text]) => collectHeadings(text).map((heading) => heading.id));
  for (const key of Object.keys(SCHEMA.properties)) {
    const id = key.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
    assert.equal(headings.filter((entry) => entry === id).length, 1, key);
  }
  assert.equal(new Set(headings).size, headings.length);
});

test("nested config keys get a heading id of the joined path", () => {
  const page = generated.files.get("reference/config-duplication.mdx");
  assert.match(page, /^### `duplicates\.minTokens` \{#duplicates-mintokens\}$/mu);
});

test("splits the config reference only when one page passes the character limit", () => {
  const small = { properties: { entry: { type: "array", items: { type: "string" }, default: [] } }, $defs: {} };
  const single = renderConfigPages(small);
  assert.equal(single.split, false);
  assert.equal(single.link("entry"), "/reference/config#entry");
  assert.equal(generated.config.split, true);
});

// ---------------------------------------------------------------------------
// Old rule anchors

test("forms the singular of a hyphenated plural", () => {
  assert.equal(singular("unused-dependencies"), "unused-dependency");
  assert.equal(singular("unused-classes"), "unused-class");
  assert.equal(singular("unused-files"), "unused-file");
});

test("maps each released anchor of the two explanation pages to a rule page or null", () => {
  const committed = readJson(ANCHOR_FILE);
  assert.deepEqual(committed, buildRuleAnchors(CONTRACT, INBOUND));
  for (const link of INBOUND.links) {
    const [path, anchor] = link.split("#");
    if (anchor === undefined || !(path in committed)) {
      continue;
    }
    assert.ok(Object.hasOwn(committed[path], anchor), link);
    const target = committed[path][anchor];
    assert.ok(target === null || generated.files.has(`${target}.mdx`), link);
  }
});

// ---------------------------------------------------------------------------
// Option groups, defaults, environment groups, rule text and MCP tables

const GROUPED = {
  ...FIXTURE,
  global_options: [
    option({ long: "--root", value_name: "ROOT", action: "set", help: "Project root", global: true, help_heading: "Project" }),
    option({ long: "--format", value_name: "FORMAT", action: "set", default: "human", help: "Output format", global: true, help_heading: "Output" }),
    option({ long: "--threads", value_name: "N", action: "set", help: "Threads", global: true, help_heading: "Performance" }),
  ],
  commands: [
    ...FIXTURE.commands,
    {
      name: "cov",
      path: "cov",
      about: "Coverage.",
      usage: "fallow cov",
      hidden: false,
      exit_codes: [],
      positionals: [],
      options: [],
      subcommands: [
        {
          name: "analyze",
          path: "cov analyze",
          about: "Analyze.",
          usage: "fallow cov analyze",
          hidden: false,
          exit_codes: [],
          positionals: [],
          subcommands: [],
          options: [
            option({ long: "--input", value_name: "PATH", action: "set", help: "Input file", help_heading: "Input" }),
            option({ long: "--json", help: "JSON", help_heading: "Output" }),
          ],
        },
      ],
    },
  ],
};

test("finds the level of the last heading before a block, outside code fences", () => {
  const text = "# A\n\n## Options\n\n```bash\n# a comment\n```\n\nX";
  assert.equal(headingLevelBefore(text, text.length), 2);
  assert.equal(headingLevelBefore("no heading", 5), 1);
  const page = `## Subcommands\n\n### analyze {#analyze}\n\n${startMarker("cli-options", "cov analyze")}\n${END}\n`;
  assert.equal(findBlocks(page, "cli/cov.mdx")[0].level, 3);
});

test("puts the option groups of a subcommand one level below its heading, with ids that name the subcommand", () => {
  assert.equal(optionIdPrefix("fallow"), "options");
  assert.equal(optionIdPrefix("dupes"), "options");
  assert.equal(optionIdPrefix("coverage analyze"), "analyze-options");
  assert.equal(optionIdPrefix("similar-code cache clear"), "cache-clear-options");
  const block = renderCliOptions(GROUPED, "cov analyze", { level: 4 });
  assert.match(block, /^#### Input \{#analyze-options-input\}$/mu);
  assert.match(block, /^#### Output \{#analyze-options-output\}$/mu);
  assert.doesNotMatch(block, /^### /mu);
});

test("gives each option group of every command of the real contract an id that is unique on its page", () => {
  const pages = new Map();
  for (const [path] of indexCommands(CONTRACT)) {
    const page = path === "fallow" ? "index" : path.split(" ")[0];
    const ids = pages.get(page) ?? [];
    ids.push(...[...renderCliOptions(CONTRACT, path).matchAll(/\{#([\w-]+)\}/gu)].map((match) => match[1]));
    pages.set(page, ids);
  }
  for (const [page, ids] of pages) {
    assert.equal(new Set(ids).size, ids.length, page);
  }
});

test("adds the line about the global options under the last option table of a page only", () => {
  const note = renderGlobalNote(GROUPED);
  assert.equal(
    note,
    "The [global options](/cli/global-flags) are in these groups: [Project](/cli/global-flags#options-project), [Output](/cli/global-flags#options-output), [Performance](/cli/global-flags#options-performance).",
  );
  const page = [
    "## Subcommands",
    "",
    "### demo run",
    "",
    startMarker("cli-options", "demo run"),
    END,
    "",
    "### analyze",
    "",
    startMarker("cli-options", "cov analyze"),
    END,
    "",
  ].join("\n");
  const result = renderPageBlocks(GROUPED, page, "cli/x.mdx");
  assert.equal(result.split(note).length - 1, 1);
  assert.ok(result.indexOf(note) > result.indexOf("#### Input"));
  assert.match(renderGlobalOptions(GROUPED), /^### Project \{#options-project\}$/mu);
  assert.match(renderGlobalOptions(GROUPED, { level: 4 }), /^#### Output \{#options-output\}$/mu);
});

test("keeps a later sentence of a help text that states a default, unless the contract has the default", () => {
  assert.deepEqual(defaultSentences("One. Two. Three. Defaults to `count` when omitted.", "One. Two."), ["Defaults to `count` when omitted."]);
  assert.deepEqual(defaultSentences("One. Two. Omit to use the add-on default (5000).", "One. Two."), ["Omit to use the add-on default (5000)."]);
  assert.deepEqual(defaultSentences("One. Two. The default branch wins.", "One. Two."), []);
  assert.equal(describeArgument(option({ long: "--mode", help: "Match mode. Second. Third. Defaults to `count`." })), "Match mode. Second. Defaults to `count`.");
  assert.equal(describeArgument(option({ long: "--x", default: "a", help: "X. Second. Third. Defaults to `a`." })), "X. Second.");
});

const ENV = {
  ...FIXTURE,
  environment_variables: [
    { name: "FALLOW_FORMAT", group: "output", default: "human", description: "Format" },
    { name: "FALLOW_QUIET", group: "output", default: null, description: "Quiet" },
    { name: "FALLOW_CACHE_DIR", group: "cache", default: null, description: "Cache" },
  ],
};

test("selects environment variables by group, and shows a default column only when a row has a default", () => {
  const names = (argument) => selectEnvironment(ENV, argument).map((variable) => variable.name);
  assert.deepEqual(names("group:output"), ["FALLOW_FORMAT", "FALLOW_QUIET"]);
  assert.deepEqual(names("group:output !FALLOW_QUIET"), ["FALLOW_FORMAT"]);
  assert.deepEqual(names("!group:output"), ["FALLOW_CACHE_DIR"]);
  assert.deepEqual(names("FALLOW_CACHE"), ["FALLOW_CACHE_DIR"]);
  assert.throws(() => names("group:nope"), /No environment variable has the group "nope"\. The groups are: output, cache\./u);
  assert.equal(renderEnvironment(ENV, "group:output"), "| Variable | Default | Description |\n|:--|:--|:--|\n| `FALLOW_FORMAT` | `human` | Format |\n| `FALLOW_QUIET` |  | Quiet |");
  assert.equal(renderEnvironment(ENV, "group:cache"), "| Variable | Description |\n|:--|:--|\n| `FALLOW_CACHE_DIR` | Cache |");
});

test("checks that the environment reference page holds each variable exactly once", () => {
  const page = (...arguments_) => arguments_.map((argument) => `${startMarker("environment-variables", argument)}\n${END}`).join("\n\n");
  assert.doesNotThrow(() => checkEnvironmentBlocks(ENV, page("group:output", "group:cache"), ENVIRONMENT_PAGE));
  assert.throws(() => checkEnvironmentBlocks(ENV, page("group:output"), ENVIRONMENT_PAGE), /no block of the page holds FALLOW_CACHE_DIR/u);
  assert.throws(() => checkEnvironmentBlocks(ENV, page("group:output", "FALLOW_FORMAT"), ENVIRONMENT_PAGE), /FALLOW_FORMAT is also in the block/u);
  assert.doesNotThrow(() => checkEnvironmentBlocks(ENV, page("group:output"), "integrations/mcp.mdx"));
});

test("uses the display label of an issue type as the title of its rule page", () => {
  assert.equal(ruleTitle({ id: "x", display_label: "High cyclomatic complexity", summary_label: "Old", label: "Old" }), "High cyclomatic complexity");
  assert.equal(ruleTitle({ id: "x", summary_label: "Unused files" }), "Unused files");
  for (const issue of CONTRACT.issue_types) {
    assert.equal(generated.files.get(`rules/${issue.id}.mdx`).match(/^title: (.*)$/mu)[1], JSON.stringify(issue.display_label), issue.id);
  }
});

test("marks only a leading statement of a prose example as code", () => {
  assert.equal(leadingCode("export const formatPrice = ... exists in src/money.ts, but no module imports it."), "export const formatPrice = ...");
  assert.equal(leadingCode("export interface LegacyProps is exported, but unused."), "export interface LegacyProps");
  assert.equal(leadingCode("export function makeUser(): InternalUser exposes InternalUser."), "export function makeUser(): InternalUser");
  assert.equal(leadingCode("/** @deprecated Use b. */ export function a() is still imported."), "/** @deprecated Use b. */ export function a()");
  assert.equal(leadingCode("export is a keyword."), null);
  assert.equal(leadingCode("src/a.ts imports src/b.ts."), null);
  assert.equal(leadingCode("export `x` is quoted."), null);
});

test("renders an example as a code block only when the contract fences it or each of its lines is code", () => {
  assert.equal(isCodeExample("export const formatPrice = ... exists in src/money.ts, but no module imports formatPrice."), false);
  assert.equal(isCodeExample("A change adds `if (x) return;` to `src/a.ts`."), false);
  assert.equal(isCodeExample("import { a } from './a';\nexport const b = a();"), true);
  assert.equal(isCodeExample("The first line is prose.\nexport const b = a();"), false);
  assert.equal(isCodeExample("```ts\nconst a = 1\n```"), true);
  const contract = { ...CONTRACT, issue_types: CONTRACT.issue_types.map((issue) => (issue.id === "unused-export" ? { ...issue, explanation: { ...issue.explanation, example: "import { a } from './a';\nexport const b = a();" } } : issue)) };
  assert.match(renderRule(contract, "unused-export"), /## Example\n\n```ts\nimport \{ a \} from '.\/a';\nexport const b = a\(\);\n```\n/u);
  assert.match(generated.files.get("rules/unused-export.mdx"), /^`export const formatPrice = \.\.\.` exists in `src\/money\.ts`/mu);
});

test("writes the note of an issue type below the facts table, not in a cell", () => {
  const page = generated.files.get("rules/unused-dependency.mdx");
  assert.doesNotMatch(page, /\| Note \|/u);
  assert.match(page, /\n\*\*Note\.\*\* `--unused-deps` controls /u);
});

const MCP = {
  ...FIXTURE,
  mcp_tools: [
    { name: "analyze", description: "Full analysis {a}", cli_command: "fallow dead-code --format json --quiet" },
    { name: "code_execute", description: "Run a snippet.", cli_command: null },
    { name: "trace", description: "Trace a | b", cli_command: "fallow trace <file> --format json --quiet" },
  ],
  mcp_resources: [{ uri: "fallow://explain/{issue_type}", description: "Explain one issue type" }],
};

test("renders the MCP tools and resources tables", () => {
  assert.equal(
    renderMcpTools(MCP),
    [
      "Each CLI equivalent runs with `--format json --quiet`.",
      "",
      "| Tool | Description | CLI equivalent |",
      "|:--|:--|:--|",
      "| `analyze` | Full analysis \\{a\\}. | `fallow dead-code` |",
      "| `code_execute` | Run a snippet. | none |",
      "| `trace` | Trace a \\| b. | `fallow trace <file>` |",
    ].join("\n"),
  );
  assert.equal(renderMcpResources(MCP), "| Resource | Content |\n|:--|:--|\n| `fallow://explain/{issue_type}` | Explain one issue type. |");
  assert.throws(() => renderMcpTools(FIXTURE), /The contract has no mcp_tools/u);
  for (const text of [renderMcpTools(CONTRACT), renderMcpResources(CONTRACT)]) {
    assert.deepEqual(findBareMdx(text), []);
  }
});

test("the contracts README says when the files come from a build of the main branch", () => {
  const main = renderContractReadme({ version: "9.9.9" }, { mainBuild: true });
  assert.match(main, /a build of the main branch of fallow, with the version 9\.9\.9\. No release has this version yet\./u);
  assert.ok(isMainBuild(main));
  assert.match(renderContractReadme({ version: "9.9.9" }), /The files come from fallow 9\.9\.9\./u);
  const files = buildGeneratedFiles({ contract: CONTRACT, schema: SCHEMA, inbound: INBOUND, existing: (path) => (path === "contracts/README.md" ? main : undefined) }).files;
  assert.ok(isMainBuild(files.get("contracts/README.md")));
});

// ---------------------------------------------------------------------------
// Command line

test("parses the command-line arguments", () => {
  assert.deepEqual(parseArguments([]), { mode: "write", scopes: [], source: null, mainBuild: false });
  assert.deepEqual(parseArguments(["rules", "reference"]), { mode: "write", scopes: ["rules", "reference"], source: null, mainBuild: false });
  assert.equal(parseArguments(["--check"]).mode, "check");
  assert.deepEqual(parseArguments(["--update-contracts", "/bin/fallow"]), { mode: "update-contracts", scopes: [], source: "/bin/fallow", mainBuild: false });
  assert.equal(parseArguments(["--update-contracts", "/bin/fallow", "--main-build"]).mainBuild, true);
  assert.throws(() => parseArguments(["--main-build"]), /works only with --update-contracts/u);
  assert.throws(() => parseArguments(["--update-contracts"]), /needs a path/u);
  assert.throws(() => parseArguments(["--nope"]), /Unknown argument/u);
  assert.throws(() => parseArguments(["--check", "rules"]), /only the write mode/u);
});
