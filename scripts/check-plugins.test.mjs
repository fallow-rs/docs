import assert from "node:assert/strict";
import test from "node:test";

import { gzipSync } from "node:zlib";

import {
  capabilitiesPath,
  listedPlugins,
  missingPlugins,
  normalize,
  tarballEntry,
} from "./check-plugins.mjs";

/** A gzipped tar archive with one regular file for each `[name, text]` pair. */
const tarball = (files) => {
  const blocks = files.flatMap(([name, text]) => {
    const header = Buffer.alloc(512);
    header.write(name, 0, "utf8");
    header.write(`${Buffer.byteLength(text).toString(8).padStart(11, "0")}\0`, 124, "ascii");
    header.write("0", 156, "ascii");
    const body = Buffer.alloc(Math.ceil(Buffer.byteLength(text) / 512) * 512);
    body.write(text, 0, "utf8");
    return [header, body];
  });
  return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]));
};

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

test("reads one file from a gzipped npm tarball", () => {
  const archive = tarball([
    ["package/README.md", "x".repeat(700)],
    ["package/capabilities.json", '{"plugins":{"names":["next"]}}'],
  ]);
  assert.equal(tarballEntry(archive, "package/capabilities.json"), '{"plugins":{"names":["next"]}}');
});

test("throws when the tarball has no such file", () => {
  assert.throws(
    () => tarballEntry(tarball([["package/README.md", "x"]]), "package/capabilities.json"),
    /package\/capabilities.json/,
  );
});
