import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

// Checks that the built-in plugin page has a row for each plugin of the
// latest fallow release. The plugin names come from `plugins.names` in the
// `capabilities.json` file of the release. The script reads that file from
// the published npm package, because npm serves a release before its Git tag
// exists.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = "frameworks/built-in.mdx";
const REGISTRY_URL = "https://registry.npmjs.org/fallow/latest";
const CAPABILITIES_ENTRY = "package/capabilities.json";
const TAR_BLOCK = 512;

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

// The heading after the plugin tables. The tables below it describe the
// config of some plugins, so their rows do not count as plugin rows.
const NOTES_HEADING = "{#plugin-notes}";

/** The normalized names of the plugin rows above the notes heading. */
export const listedPlugins = (page) => {
  const tables = page.split(NOTES_HEADING)[0];
  return new Set([...tables.matchAll(PLUGIN_ROW)].map(([, name]) => normalize(name)));
};

/** The plugin names that have no row on the page. */
export const missingPlugins = (names, page) => {
  const listed = listedPlugins(page);
  return names.filter((name) => !listed.has(normalize(PAGE_NAMES.get(name) ?? name)));
};

/**
 * The file that `--capabilities <file>` names, or `undefined` without the
 * flag. Throws when the flag has no file, so the script does not read the
 * release from the network by mistake.
 */
export const capabilitiesPath = (args) => {
  const flag = args.indexOf("--capabilities");
  if (flag === -1) {
    return undefined;
  }
  const path = args[flag + 1];
  if (path === undefined || path.startsWith("--")) {
    throw new Error("--capabilities needs a file path.");
  }
  return path;
};

/** The text of the file `name` in a gzipped tar archive, such as an npm tarball. */
export const tarballEntry = (archive, name) => {
  const tar = gunzipSync(archive);
  let offset = 0;
  while (offset + TAR_BLOCK <= tar.length && tar[offset] !== 0) {
    const field = (start, length) =>
      tar.toString("utf8", offset + start, offset + start + length).replace(/\0.*$/s, "");
    const prefix = field(345, 155);
    const path = prefix === "" ? field(0, 100) : `${prefix}/${field(0, 100)}`;
    const size = Number.parseInt(field(124, 12).trim(), 8);
    const start = offset + TAR_BLOCK;
    if (path === name) {
      return tar.toString("utf8", start, start + size);
    }
    offset = start + Math.ceil(size / TAR_BLOCK) * TAR_BLOCK;
  }
  throw new Error(`The tarball has no ${name}.`);
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
  const { version, dist } = await fetchJson(REGISTRY_URL);
  const response = await fetch(dist.tarball);
  if (!response.ok) {
    throw new Error(`GET ${dist.tarball} returned ${response.status}.`);
  }
  const archive = Buffer.from(await response.arrayBuffer());
  return {
    source: `fallow ${version}`,
    capabilities: JSON.parse(tarballEntry(archive, CAPABILITIES_ENTRY)),
  };
};

const run = async () => {
  const { source, capabilities } = await readCapabilities(
    capabilitiesPath(process.argv.slice(2)),
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
    "Add a row to the matching table. If the row uses another name, add it to PAGE_NAMES in scripts/check-plugins.mjs.",
  );
  process.exitCode = 1;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await run();
}
