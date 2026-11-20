import assert from "node:assert/strict";
import test from "node:test";

import { capabilitiesPath, listedPlugins, missingPlugins, normalize } from "./check-plugins.mjs";

const PAGE = [
  "## Frameworks {#frameworks}",
  "",
  "| Plugin | Activated by | What fallow reads |",
  "|:--|:--|:--|",
  "| **Next.js** | `next` | |",
  "| **AdonisJS** | `@adonisjs/core` | |",
  "",
  "## Bundlers {#bundlers}",
  "",
  "| **Vite+** | `vite-plus` | |",
  "",
  "## Notes for some plugins {#plugin-notes}",
  "",
  "| **Gulp** | Config details after the plugin tables |",
].join("\n");

test("normalizes plugin names and page names to one form", () => {
  assert.equal(normalize("Next.js"), "nextjs");
  assert.equal(normalize("vite-plus"), normalize("Vite+"));
  assert.equal(normalize("solid-start"), normalize("SolidStart"));
});

test("reads only the plugin rows above the notes heading", () => {
  assert.deepEqual([...listedPlugins(PAGE)].sort(), ["adonisjs", "nextjs", "viteplus"]);
});

test("reports a plugin without a row and accepts a mapped page name", () => {
  assert.deepEqual(missingPlugins(["nextjs", "adonis", "vite-plus", "gulp"], PAGE), ["gulp"]);
});

test("reads the capabilities path and rejects the flag without a file", () => {
  assert.equal(capabilitiesPath([]), undefined);
  assert.equal(capabilitiesPath(["--capabilities", "caps.json"]), "caps.json");
  assert.throws(() => capabilitiesPath(["--capabilities"]), /needs a file path/);
  assert.throws(() => capabilitiesPath(["--capabilities", "--other"]), /needs a file path/);
});
