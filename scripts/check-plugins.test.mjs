import assert from "node:assert/strict";
import test from "node:test";

import { listedPlugins, missingPlugins, normalize } from "./check-plugins.mjs";

const PAGE = [
  "<Tabs>",
  '  <Tab title="Frameworks">',
  "    | Plugin | Enabler packages |",
  "    |:-------|:-----------------|",
  "    | **Next.js** | `next` |",
  "    | **AdonisJS** | `@adonisjs/core` |",
  '  <Tab title="Bundlers">',
  "    | **Vite+** | `vite-plus` |",
  "</Tabs>",
  "",
  "  | **Gulp** | Config details after the plugin tabs |",
].join("\n");

test("normalizes plugin names and page names to one form", () => {
  assert.equal(normalize("Next.js"), "nextjs");
  assert.equal(normalize("vite-plus"), normalize("Vite+"));
  assert.equal(normalize("solid-start"), normalize("SolidStart"));
});

test("reads only the plugin rows of the tabs", () => {
  assert.deepEqual([...listedPlugins(PAGE)].sort(), ["adonisjs", "nextjs", "viteplus"]);
});

test("reports a plugin without a row and accepts a mapped page name", () => {
  assert.deepEqual(missingPlugins(["nextjs", "adonis", "vite-plus", "gulp"], PAGE), ["gulp"]);
});
