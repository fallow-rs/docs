import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ANCHOR_FILE,
  CLI_CONTRACT,
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
  describeSchema,
  escapeCell,
  escapeParagraph,
  escapeProse,
  findBlocks,
  firstSentences,
  indexCommands,
  indexSummary,
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
  renderGlobalOptions,
  renderRule,
  replaceBlocks,
  replaceDashes,
  ruleDescription,
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

test("escapes a table cell: one line and each pipe, also in code", () => {
  assert.equal(escapeCell("a | b\nc `x|y`"), "a \\| b c `x\\|y`");
});

test("escapes the start of a paragraph that MDX reads as a module or a block", () => {
  assert.equal(escapeParagraph("export function a() is unused."), "`export` function a() is unused.");
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
  const long = ruleDescription({ id: "x", explanation: { summary: "word ".repeat(60) } });
  assert.ok(long.length <= 160);
  assert.ok(long.startsWith("Reference: "));
});

test("gives each rule page its own description, also when issue types share a summary", () => {
  const shared = { issue_types: [
    { id: "a", explanation: { name: "Dangerous HTML sink", summary: "Catalogue security candidate for CWE-79" } },
    { id: "b", explanation: { name: "JQuery HTML sink", summary: "Catalogue security candidate for CWE-79" } },
    { id: "c", explanation: { name: "Unused file", summary: "File is not reachable from any entry point" } },
  ] };
  assert.equal(ruleDescription(shared.issue_types[0], shared), "Reference: Dangerous HTML sink (catalogue security candidate for CWE-79)");
  assert.equal(ruleDescription(shared.issue_types[2], shared), "Reference: File is not reachable from any entry point");
  const descriptions = CONTRACT.issue_types.map((issue) => ruleDescription(issue, CONTRACT));
  assert.equal(new Set(descriptions).size, descriptions.length);
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
      "### Output",
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
  assert.match(page, /\| Config key in `rules` \| \[`unused-exports`\]\(\/reference\/config[\w-]*#rules\) \|/u);
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
// Command line

test("parses the command-line arguments", () => {
  assert.deepEqual(parseArguments([]), { mode: "write", scopes: [], source: null });
  assert.deepEqual(parseArguments(["rules", "reference"]), { mode: "write", scopes: ["rules", "reference"], source: null });
  assert.equal(parseArguments(["--check"]).mode, "check");
  assert.deepEqual(parseArguments(["--update-contracts", "/bin/fallow"]), { mode: "update-contracts", scopes: [], source: "/bin/fallow" });
  assert.throws(() => parseArguments(["--update-contracts"]), /needs a path/u);
  assert.throws(() => parseArguments(["--nope"]), /Unknown argument/u);
  assert.throws(() => parseArguments(["--check", "rules"]), /only the write mode/u);
});
