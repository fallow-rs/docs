import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Checks that the built-in plugin page has a row for each plugin of the
// latest fallow release. The plugin names come from `plugins.names` in the
// `capabilities.json` file of the release.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = "frameworks/built-in.mdx";
const REGISTRY_URL = "https://registry.npmjs.org/fallow/latest";
const capabilitiesUrl = (version) =>
  `https://raw.githubusercontent.com/fallow-rs/fallow/v${version}/npm/fallow/capabilities.json`;

// A plugin row has the plugin name in bold in its first cell.
const PLUGIN_ROW = /^\s*\| \*\*([^*]+)\*\* \|/gm;

// The page name of a plugin whose page name does not match its plugin name.
const PAGE_NAMES = new Map([
  ["adonis", "AdonisJS"],
  ["egg", "Egg.js / tegg"],
  ["vscode", "VS Code extension"],
]);

/** Lowercase letters and digits only, with `+` as `plus` (`Vite+` is `viteplus`). */
export const normalize = (name) =>
  name.toLowerCase().replaceAll("+", "plus").replace(/[^a-z0-9]/g, "");

/**
 * The normalized names of the plugin rows on the page. Only the first
 * `<Tabs>` block lists plugins. The tables after it describe config files.
 */
export const listedPlugins = (page) => {
  const tables = page.split("</Tabs>")[0];
  return new Set([...tables.matchAll(PLUGIN_ROW)].map(([, name]) => normalize(name)));
};

/** The plugin names that have no row on the page. */
export const missingPlugins = (names, page) => {
  const listed = listedPlugins(page);
  return names.filter((name) => !listed.has(normalize(PAGE_NAMES.get(name) ?? name)));
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} returned ${response.status}.`);
  }
  return response.json();
};

const readCapabilities = async (path) => {
  if (path !== undefined) {
    return { source: path, capabilities: JSON.parse(await readFile(path, "utf8")) };
  }
  const { version } = await fetchJson(REGISTRY_URL);
  return { source: `fallow ${version}`, capabilities: await fetchJson(capabilitiesUrl(version)) };
};

const run = async () => {
  const flag = process.argv.indexOf("--capabilities");
  const { source, capabilities } = await readCapabilities(
    flag === -1 ? undefined : process.argv[flag + 1],
  );
  const names = capabilities.plugins?.names;
  if (!Array.isArray(names) || names.length === 0) {
    throw new Error(`${source} has no plugins.names list.`);
  }
  const missing = missingPlugins(names, await readFile(resolve(ROOT, PAGE), "utf8"));
  if (missing.length === 0) {
    console.log(`${PAGE} lists each plugin of ${source}.`);
    return;
  }
  console.error(`${PAGE} has no row for these plugins of ${source}:`);
  for (const name of missing) {
    console.error(`  ${name}`);
  }
  console.error(
    "Add a row to the matching tab. If the row uses another name, add it to PAGE_NAMES in scripts/check-plugins.mjs.",
  );
  process.exitCode = 1;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await run();
}
