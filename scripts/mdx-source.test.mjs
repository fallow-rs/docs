import assert from "node:assert/strict";
import test from "node:test";

import { collectAnchorSets, collectAnchors, collectHeadings, lineAt, stripCode } from "./mdx-source.mjs";

test("collects headings, explicit ids and titled components", () => {
  const anchors = collectAnchors(
    [
      "## Exit codes",
      "### `auto_fixable` is per-finding {#auto-fixable}",
      '<Accordion title="CSS and SCSS extraction">',
      "```bash",
      "# Not a heading",
      "```",
    ].join("\n"),
  );
  assert.deepEqual(
    [...anchors].sort(),
    ["auto-fixable", "css-and-scss-extraction", "exit-codes"],
  );
});

test("separates explicit anchors from generated ones", () => {
  const { explicit } = collectAnchorSets(
    '## Unused files {#unused-files}\n## Unused exports\n<div id="tools" />',
  );
  assert.deepEqual([...explicit].sort(), ["tools", "unused-files"]);
});

test("reports the line, the text and the id of each heading", () => {
  assert.deepEqual(collectHeadings("intro\n\n## Unused files {#unused-files}\n### `--trace` option"), [
    { line: 3, text: "Unused files", id: "unused-files", explicit: true },
    { line: 4, text: "`--trace` option", id: "--trace-option", explicit: false },
  ]);
});

test("blanks code but keeps line numbers", () => {
  const text = "Run `fallow --now`.\n```bash\necho now\n```\nEnd";
  const stripped = stripCode(text);
  assert.equal(stripped.split("\n").length, text.split("\n").length);
  assert.ok(stripped.startsWith("Run `xxxxxxxxxxxx`."));
  assert.ok(!stripped.includes("now"));
  assert.equal(lineAt(stripped, stripped.indexOf("End")), 5);
});
