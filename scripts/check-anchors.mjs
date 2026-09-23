import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// `mint broken-links` checks page paths only, so a link to a heading that
// does not exist still passes it.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FENCE = /```[\s\S]*?```/g;
const HEADING = /^#{1,6}\s+(.*)$/gm;
const EXPLICIT_ID = /\{#([\w-]+)\}\s*$/;
const TITLED_COMPONENT = /<(?:Accordion|Tab|Step)\b[^>]*\btitle="([^"]+)"/g;
const ID_ATTRIBUTE = /\bid="([^"]+)"/g;
const ANCHOR_LINK = /(?:\]\(|href=")(\/[^)#"\s]*)?#([^)"\s]+)/g;

// Blank code blocks out but keep their line breaks, so line numbers stay true.
const stripFences = (text) =>
  text.replace(FENCE, (block) => block.replace(/[^\n]/g, ""));

/** Mintlify slug: drop markup and punctuation, lowercase, join words with `-`. */
export const slugify = (heading) =>
  heading
    .replace(/<[^>]+>|`/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

/** Every anchor that a page defines. */
export const collectAnchors = (text) => {
  const body = stripFences(text);
  const anchors = new Set();
  for (const [, heading] of body.matchAll(HEADING)) {
    const explicit = heading.match(EXPLICIT_ID);
    anchors.add(explicit ? explicit[1] : slugify(heading));
  }
  for (const [, title] of body.matchAll(TITLED_COMPONENT)) {
    anchors.add(slugify(title));
  }
  for (const [, id] of body.matchAll(ID_ATTRIBUTE)) {
    anchors.add(id);
  }
  return anchors;
};

/**
 * Links whose anchor is missing on the target page.
 * @param {Map<string, string>} pages page route (`/cli/health`) to MDX source
 */
export const findBrokenAnchors = (pages) => {
  const anchorsByRoute = new Map(
    [...pages].map(([route, text]) => [route, collectAnchors(text)]),
  );
  const broken = [];
  for (const [route, text] of pages) {
    const body = stripFences(text);
    for (const match of body.matchAll(ANCHOR_LINK)) {
      const target = match[1] ?? route;
      const anchors = anchorsByRoute.get(target);
      if (anchors === undefined || anchors.has(match[2])) {
        continue;
      }
      const line = body.slice(0, match.index).split("\n").length;
      broken.push({ route, line, link: `${target}#${match[2]}` });
    }
  }
  return broken;
};

const readPages = async () => {
  const files = execFileSync("git", ["-C", ROOT, "ls-files", "*.mdx"], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  const entries = await Promise.all(
    files.map(async (file) => [
      `/${file.replace(/\.mdx$/, "")}`,
      await readFile(resolve(ROOT, file), "utf8"),
    ]),
  );
  return new Map(entries);
};

const run = async () => {
  const broken = findBrokenAnchors(await readPages());
  if (broken.length === 0) {
    console.log("All heading anchors resolve.");
    return;
  }
  for (const { route, line, link } of broken) {
    console.error(`${route.slice(1)}.mdx:${line}: no heading for ${link}`);
  }
  console.error(
    "Point each link to an existing heading, or give the heading an explicit {#id}.",
  );
  process.exitCode = 1;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await run();
}
