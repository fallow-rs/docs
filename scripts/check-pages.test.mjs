import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CHARACTER_LIMIT,
  LINE_BUDGETS,
  buildBaseline,
  buildIndex,
  checkComponents,
  checkEmDash,
  checkEnding,
  checkFrontmatter,
  checkHidden,
  checkHistory,
  checkInbound,
  checkLinks,
  checkNavigation,
  checkProject,
  checkSize,
  compareBaseline,
  nextBaseline,
  parseArguments,
  summarize,
} from "./check-pages.mjs";

const FRONTMATTER = '---\ntitle: "Page"\ndescription: "What the reader gets."\n---\n';
const EM_DASH = String.fromCodePoint(0x2014);

const page = (body) => `${FRONTMATTER}\n${body}\n`;
const lines = (found) => found.map((entry) => entry.line);
const pagesOf = (entries) => new Map(Object.entries(entries));
const docsJsonOf = (...pages) =>
  JSON.stringify({ navigation: { tabs: [{ tab: "Documentation", groups: [{ group: "G", icon: "i", pages }] }] } }, null, 2);

// ---------------------------------------------------------------------------
// link-target

const LINK_PAGES = pagesOf({
  "index.mdx": page("## Start"),
  "cli/dupes.mdx": page("## Options\n## Exit codes {#exit-codes}"),
  "analysis/index.mdx": page("## Families"),
  "analysis/dead-code.mdx": page("## Unused files"),
  "cloud/beacon.mdx": page("## Setup"),
});
const links = (body, assetExists = () => true) => {
  const pages = new Map([...LINK_PAGES, ["guides/task.mdx", body]]);
  return checkLinks("guides/task.mdx", body, buildIndex(pages), assetExists);
};

test("link-target accepts pages, anchors, landings and trailing slashes", () => {
  const body = [
    "[a](/cli/dupes) [b](/cli/dupes/#options) [c](/cli/dupes#exit-codes)",
    '<Card href="/analysis/dead-code#unused-files" />',
    "[landing](/cli) [index](/analysis/) [root](/) [query](/cli/dupes?x=1)",
    "[full](https://fallow.tools/docs/cli/dupes/) [file](https://fallow.tools/docs/llms.txt)",
    "[external](https://github.com/fallow-rs/fallow) [mail](mailto:a@example.com)",
  ].join("\n");
  assert.deepEqual(links(body), []);
});

test("link-target reports a missing page, a missing anchor and a missing same-page anchor", () => {
  const found = links("## Here\n[a](/cli/missing)\n[b](/cli/dupes#nowhere)\n[c](#here) [d](#gone)");
  assert.deepEqual(lines(found), [2, 3, 4]);
  assert.match(found[0].message, /No page serves \/cli\/missing/u);
  assert.match(found[1].message, /\/cli\/dupes has no heading with the id #nowhere/u);
  assert.match(found[2].message, /#gone/u);
});

test("link-target reports an anchor on a generated landing page", () => {
  const [found] = links("[a](/cli/#global-options)");
  assert.match(found.message, /generated landing page/u);
});

test("link-target checks only the page of cloud links and full URLs", () => {
  assert.deepEqual(links("[a](/cloud/beacon#any-anchor) [b](https://docs.fallow.cloud/beacon#x) [c](https://fallow.tools/docs/cli/dupes#x)"), []);
  assert.deepEqual(lines(links("[a](/cloud/missing)\n[b](https://docs.fallow.cloud/missing)\n[c](https://fallow.tools/docs/nope)")), [1, 2, 3]);
});

test("link-target ignores links in code and checks assets", () => {
  assert.deepEqual(links("`[a](/cli/missing)`\n```md\n[b](/cli/missing)\n```"), []);
  const found = links("![logo](/images/missing.png) ![ok](/images/ok.png)", (path) => path === "images/ok.png");
  assert.deepEqual(lines(found), [1]);
  assert.match(found[0].message, /images\/missing\.png/u);
});

// ---------------------------------------------------------------------------
// nav-complete

test("nav-complete accepts a navigation that lists each page once", () => {
  const pages = pagesOf({ "index.mdx": "", "cli/dupes.mdx": "" });
  assert.deepEqual(checkNavigation(pages, docsJsonOf("index", "cli/dupes")), []);
});

test("nav-complete reports a page outside the navigation, a missing page and a duplicate", () => {
  const pages = pagesOf({ "index.mdx": "", "cli/dupes.mdx": "", "cli/orphan.mdx": "" });
  const found = checkNavigation(pages, docsJsonOf("index", "cli/dupes", "cli/dupes", "cli/gone"));
  assert.deepEqual(
    found.map((entry) => [entry.path, entry.message.slice(0, 40)]),
    [
      ["cli/orphan.mdx", "The page is not in docs.json. Add it to "],
      ["docs.json", 'docs.json lists "cli/dupes" 2 times. Lis'],
      ["docs.json", 'docs.json lists "cli/gone", but cli/gone'],
    ],
  );
  assert.equal(found[1].line, 13);
});

// ---------------------------------------------------------------------------
// page-size

test("page-size accepts a page at its budget and pages without a budget", () => {
  const atBudget = `${"line\n".repeat(LINE_BUDGETS.get("concepts"))}`;
  assert.deepEqual(checkSize("concepts/graph.mdx", atBudget), []);
  assert.deepEqual(checkSize("cli/audit.mdx", "line\n".repeat(2000)), []);
});

test("page-size reports lines over the budget of the page type and characters over the hard limit", () => {
  const [lineViolation] = checkSize("quickstart.mdx", "line\n".repeat(151));
  assert.deepEqual(lineViolation.measure, { name: "lines", value: 151 });
  const [characterViolation] = checkSize("cli/audit.mdx", "x".repeat(CHARACTER_LIMIT + 1));
  assert.deepEqual(characterViolation.measure, { name: "characters", value: CHARACTER_LIMIT + 1 });
  assert.equal(checkSize("rules/unused-files.mdx", "line\n".repeat(81)).length, 1);
});

// ---------------------------------------------------------------------------
// history-text

const history = (body) => checkHistory("guides/task.mdx", body).map((entry) => entry.message.split('"')[1]);

test("history-text reports version history and roadmap wording", () => {
  assert.deepEqual(
    history(
      [
        "Since v1.2, fallow reads the file.",
        "Before v1.2 the option had no effect.",
        "As of v3.0 this works.",
        "Since 3.26.0, the build directory is ignored.",
        "Before fallow 3.32 handles were longer.",
        "This option was added in version 2.",
        "The rule was introduced in v2.4.",
        "Fallow previously reported this.",
        "Fallow no longer reports this.",
        "The flag is now an alias. Both options are now stable.",
        "Fallow now supports Bun.",
        "Support will be added later. Coming soon.",
        "We fix this in a follow-up. See the follow-up PR.",
      ].join("\n"),
    ),
    [
      "Since v1.2",
      "Before v1.2",
      "As of v3.0",
      "Since 3.26.0",
      "Before fallow 3.32",
      "added in version 2",
      "introduced in v2",
      "previously",
      "Fallow no longer",
      "is now",
      "are now",
      "now supports",
      "will be added",
      "Coming soon",
      "in a follow-up",
      "follow-up PR",
    ],
  );
});

test("history-text ignores the known false positives", () => {
  assert.deepEqual(
    history(
      [
        "```bash",
        "# now run fallow again, it is now faster",
        "```",
        "Run `fallow --since v1.2` to compare.",
        "Check the project right now. Now run fallow again.",
        "Compare against a previously saved baseline file.",
        "A marker is stale when it no longer matches any issue.",
        "Delete the code that is no longer used.",
        "pnpm before 10.5.1 ignores the overrides.",
        "The beacon reads the data from V8.",
        "Suggested follow-up: the read-only follow-up commands.",
        "Fallow knows the files now.",
      ].join("\n"),
    ),
    [],
  );
});

// ---------------------------------------------------------------------------
// hidden-content

const hidden = (body) => lines(checkHidden("guides/task.mdx", body));

test("hidden-content reports a callout or a requirement inside an Accordion or a Tab", () => {
  const body = [
    '<Accordion title="More">',
    "  <Warning>Do not run this in production.</Warning>",
    "  You need Node.js 22.",
    "</Accordion>",
    "<Tabs>",
    '  <Tab title="npm">',
    "    - Requires npm 10.",
    "    <Note>A note.</Note>",
    "  </Tab>",
    "</Tabs>",
    '<Tab title="one line"><Info>Hidden.</Info></Tab>',
  ].join("\n");
  assert.deepEqual(hidden(body), [2, 3, 7, 8, 11]);
});

test("hidden-content accepts callouts outside the containers and other content inside", () => {
  const body = [
    "<Warning>Visible.</Warning>",
    "You need Node.js 22.",
    "<AccordionGroup>",
    "<Tabs>",
    '  <Tab title="npm">',
    "    ```bash",
    "    # You need this comment only in code",
    "    ```",
    "    Run `<Note>` in text.",
    "  </Tab>",
    "</Tabs>",
    "<Note>After the tabs.</Note>",
    '<Tab title="closed" />',
    "<Info>Not inside a container.</Info>",
  ].join("\n");
  assert.deepEqual(hidden(body), []);
});

// ---------------------------------------------------------------------------
// frontmatter

const frontmatter = (text) => checkFrontmatter("guides/task.mdx", text).map((entry) => entry.message);

test("frontmatter accepts the allowed keys", () => {
  assert.deepEqual(
    frontmatter('---\ntitle: "A"\nsidebarTitle: "B"\ndescription: \'It\'\'s fine.\'\nkeywords: ["a", "b"]\nicon: "x"\nmode: "wide"\n---\nBody'),
    [],
  );
});

test("frontmatter reports a missing field, an unknown key, a long description and a repeated title", () => {
  assert.deepEqual(frontmatter("No frontmatter"), ["The page has no frontmatter. Add a title and a description."]);
  assert.deepEqual(frontmatter('---\ntitle: "A"\ntype: "guide"\n---\n'), [
    "The frontmatter has no description.",
    'The site does not accept the frontmatter key "type". Allowed keys: title, description, keywords, icon, sidebarTitle, mode.',
  ]);
  assert.match(frontmatter(`---\ntitle: "A"\ndescription: "${"x".repeat(161)}"\n---\n`)[0], /161 characters/u);
  assert.match(frontmatter('---\ntitle: "First run"\ndescription: "First run"\n---\n')[0], /repeats the title/u);
});

test("frontmatter ignores nested YAML lines and a description of exactly 160 characters", () => {
  assert.deepEqual(frontmatter(`---\ntitle: "A"\ndescription: "${"x".repeat(160)}"\nkeywords:\n  - unknown: value\n---\n`), []);
});

// ---------------------------------------------------------------------------
// components

test("components reports a component that the site does not render", () => {
  const found = checkComponents("guides/task.mdx", page('<Frame>\n<Card title="a" />\n</Frame>\n<ParamField />'));
  assert.deepEqual(found.map((entry) => entry.message.split(".")[0]), [
    "The site does not render the component <Frame>",
    "The site does not render the component <Frame>",
    "The site does not render the component <ParamField>",
  ]);
});

test("components ignores placeholders and generics in code", () => {
  const body = page("Use `--root <PATH>` and `Array<T>`.\n```ts\nconst x: Map<Key, Value> = new Map();\nreturn <MyComponent />;\n```\n<div><img src=\"/images/a.png\" /></div>");
  assert.deepEqual(checkComponents("guides/task.mdx", body), []);
});

// ---------------------------------------------------------------------------
// ending

test("ending reports a card grid after the last H2 and more than 3 links under Next", () => {
  const cards = page("## Steps\n\n## See also\n\n<CardGroup>\n<Card href=\"/a\" />\n</CardGroup>");
  assert.deepEqual(lines(checkEnding("guides/task.mdx", cards)), [10]);
  const many = page("## Next\n\n- [a](/a)\n- [b](/b)\n- [c](/c)\n- [d](/d)");
  assert.match(checkEnding("concepts/graph.mdx", many)[0].message, /4 links. The limit is 3/u);
});

test("ending accepts a short link list, a card grid before the last H2, and pages outside its scope", () => {
  assert.deepEqual(checkEnding("quickstart.mdx", page("<CardGroup></CardGroup>\n## Next\n\n- [a](/a)\n- [b](/b)\n- [c](/c)")), []);
  assert.deepEqual(checkEnding("cli/dupes.mdx", page("## Related\n<CardGroup></CardGroup>")), []);
  assert.deepEqual(checkEnding("guides/task.mdx", page("## Limits\n\n- [a](/a)\n- [b](/b)\n- [c](/c)\n- [d](/d)")), []);
  assert.deepEqual(checkEnding("guides/task.mdx", page("```md\n## Next\n<CardGroup>\n```")), []);
});

// ---------------------------------------------------------------------------
// em-dash

test("em-dash reports a dash in prose and ignores tool output in code", () => {
  const body = `Prose ${EM_DASH} here.\n\`a ${EM_DASH} b\`\n\`\`\`text\nfallow ${EM_DASH} output\n\`\`\`\nAn en dash – and a hyphen - pass.`;
  assert.deepEqual(lines(checkEmDash("guides/task.mdx", body)), [1]);
});

// ---------------------------------------------------------------------------
// inbound-links

const INBOUND_PAGES = buildIndex(
  pagesOf({
    "explanations/dead-code.mdx": page('## Unused files {#unused-files}\n## Unused exports\n<div id="tools" />'),
    "concepts/entry-points.mdx": page("## Entry points {#entry-points}"),
    "cli/dupes.mdx": page("## Options"),
  }),
);
const inbound = (value) => checkInbound(JSON.stringify(value, null, 2), INBOUND_PAGES);

test("inbound-links accepts existing pages, explicit ids, landings and moved pages", () => {
  assert.deepEqual(
    inbound({
      links: [
        "explanations/dead-code",
        "explanations/dead-code#unused-files",
        "explanations/dead-code#tools",
        "cli",
        "old/entry-points#entry-points",
        "older/page",
      ],
      moved: { "old/entry-points": "concepts/entry-points", "older/page": "old/entry-points" },
    }),
    [],
  );
});

test("inbound-links reports a missing page, a missing anchor and a generated id, and names the fix", () => {
  const found = inbound({
    links: ["explanations/gone", "explanations/dead-code#unused-types", "explanations/dead-code#unused-exports", "cli#options"],
  });
  assert.deepEqual(lines(found), [3, 4, 5, 6]);
  assert.match(found[0].message, /No page serves \/explanations\/gone\..*keep the page at this path, or add the path to "moved"/u);
  assert.match(found[1].message, /no heading with the id #unused-types\..*Released fallow versions link to this URL.*explicit \{#unused-types\}/u);
  assert.match(found[2].message, /id from the heading text/u);
  assert.match(found[3].message, /generated landing page/u);
});

test("inbound-links reports a moved target that does not exist and a loop", () => {
  const found = inbound({
    links: ["a/page", "b/page"],
    moved: { "a/page": "a/missing", "b/page": "c/page", "c/page": "b/page" },
  });
  assert.equal(found.length, 3);
  assert.match(found[0].message, /sends \/a\/page to \/a\/missing, but no page serves/u);
  assert.match(found[1].message, /loop/u);
  assert.match(found[2].message, /"moved" sends \/a\/page to \/a\/missing/u);
});

// ---------------------------------------------------------------------------
// Baseline

const VIOLATIONS = [
  { rule: "history-text", path: "cli/a.mdx", line: 3, message: "" },
  { rule: "history-text", path: "cli/a.mdx", line: 9, message: "" },
  { rule: "page-size", path: "analysis/b.mdx", line: 251, message: "", measure: { name: "lines", value: 300 } },
];

test("the baseline counts violations per file and records sizes", () => {
  const { rules } = buildBaseline(VIOLATIONS);
  assert.deepEqual(rules["history-text"], { "cli/a.mdx": 2 });
  assert.deepEqual(rules["page-size"], { "analysis/b.mdx": { lines: 300 } });
  assert.deepEqual(rules["em-dash"], {});
});

test("a file within its baseline passes, and a file above it or without an entry fails", () => {
  const baseline = buildBaseline(VIOLATIONS);
  assert.deepEqual(compareBaseline(VIOLATIONS, baseline), { worse: [], stale: [] });

  const worse = [
    ...VIOLATIONS,
    { rule: "history-text", path: "cli/a.mdx", line: 12, message: "" },
    { rule: "em-dash", path: "guides/new.mdx", line: 1, message: "" },
  ];
  assert.deepEqual(
    compareBaseline(worse, baseline).worse.map((entry) => [entry.rule, entry.path, entry.value, entry.limit]),
    [
      ["history-text", "cli/a.mdx", 3, 2],
      ["em-dash", "guides/new.mdx", 1, 0],
    ],
  );
  const grown = [VIOLATIONS[0], VIOLATIONS[1], { ...VIOLATIONS[2], measure: { name: "lines", value: 301 } }];
  assert.equal(compareBaseline(grown, baseline).worse[0].measure, "lines");
});

test("a file better than its baseline is stale until the baseline is lowered", () => {
  const baseline = buildBaseline(VIOLATIONS);
  const { stale } = compareBaseline([VIOLATIONS[0]], baseline);
  assert.deepEqual(stale.map((entry) => [entry.rule, entry.path, entry.measure, entry.value, entry.limit]), [
    ["page-size", "analysis/b.mdx", "lines", 0, 300],
    ["history-text", "cli/a.mdx", "count", 1, 2],
  ]);
});

test("updating the baseline refuses to raise a number unless regressions are allowed", () => {
  const baseline = buildBaseline([VIOLATIONS[0]]);
  const refused = nextBaseline(VIOLATIONS, baseline, false);
  assert.equal(refused.ok, false);
  assert.equal(refused.worse.length, 2);

  const allowed = nextBaseline(VIOLATIONS, baseline, true);
  assert.deepEqual(allowed, { ok: true, baseline: buildBaseline(VIOLATIONS) });

  const lowered = nextBaseline([VIOLATIONS[0]], buildBaseline(VIOLATIONS), false);
  assert.deepEqual(lowered.baseline.rules["history-text"], { "cli/a.mdx": 1 });
});

test("the summary separates violations in the baseline from new ones", () => {
  const rows = summarize(VIOLATIONS, [{ rule: "history-text", path: "cli/a.mdx" }]);
  assert.deepEqual(rows.find((row) => row.rule === "history-text"), { rule: "history-text", baseline: 0, files: 0, new: 2 });
  assert.deepEqual(rows.find((row) => row.rule === "page-size"), { rule: "page-size", baseline: 1, files: 1, new: 0 });
});

test("the arguments allow --allow-regression only with --update-baseline", () => {
  assert.deepEqual(parseArguments(["--update-baseline", "--allow-regression"]), { help: false, update: true, allowRegression: true });
  assert.throws(() => parseArguments(["--allow-regression"]), /only with --update-baseline/u);
  assert.throws(() => parseArguments(["--fix"]), /Unknown argument: --fix/u);
});

// ---------------------------------------------------------------------------
// Whole project and the written rules

test("a page that follows every rule passes the whole check", () => {
  const pages = pagesOf({
    "quickstart.mdx": page("## Before you start\n\nRead [Install](/installation#steps).\n\n## Next\n\n- [Entry points](/concepts/entry-points)"),
    "installation.mdx": page("## Steps {#steps}"),
    "concepts/entry-points.mdx": page("## Entry points {#entry-points}\n\n## Next\n\n- [First run](/quickstart)"),
  });
  const found = checkProject({
    pages,
    docsJson: docsJsonOf("quickstart", "installation", "concepts/entry-points"),
    inboundJson: JSON.stringify({ links: ["concepts/entry-points#entry-points"], moved: {} }),
  });
  assert.deepEqual(found, []);
});

test("the line budgets match the page types in PAGE-TYPES.md", () => {
  const written = new Map();
  const text = readFileSync(new URL("../PAGE-TYPES.md", import.meta.url), "utf8");
  for (const [, places, budget] of text.matchAll(/^\| [A-Z][a-z ]+ \| (`[^|]+`) \| (\d+) lines \|$/gmu)) {
    for (const [, place] of places.matchAll(/`([\w.-]+)\/?`/gu)) {
      written.set(place, Number(budget));
    }
  }
  assert.deepEqual(written, LINE_BUDGETS);
});
