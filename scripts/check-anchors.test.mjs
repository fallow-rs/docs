import assert from "node:assert/strict";
import test from "node:test";

import { collectAnchors, findBrokenAnchors } from "./check-anchors.mjs";

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

test("reports a link to a missing heading and accepts an existing one", () => {
  const pages = new Map([
    ["/cli/health", "## Section selection\n\nSee [coverage](#coverage-istanbul)."],
    [
      "/cli/audit",
      "Use [the flag](/cli/health#section-selection) or [old](/cli/health#coverage).",
    ],
  ]);
  assert.deepEqual(findBrokenAnchors(pages), [
    { route: "/cli/health", line: 3, link: "/cli/health#coverage-istanbul" },
    { route: "/cli/audit", line: 1, link: "/cli/health#coverage" },
  ]);
});

test("ignores links to pages outside the docs and links inside code", () => {
  const pages = new Map([
    [
      "/index",
      "[Pricing](/pricing#plans)\n```md\n[x](/index#nowhere)\n```\n## Start\n[y](#end)",
    ],
  ]);
  assert.deepEqual(findBrokenAnchors(pages), [
    { route: "/index", line: 6, link: "/index#end" },
  ]);
});
