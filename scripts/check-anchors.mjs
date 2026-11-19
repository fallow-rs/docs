import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { collectAnchors, lineAt, listPagePaths, stripFences } from "./mdx-source.mjs";

// Checks that each link to a heading points to a heading that exists on the
// target page.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ANCHOR_LINK = /(?:\]\(|href=")(\/[^)#"\s]*)?#([^)"\s]+)/g;

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
      broken.push({ route, line: lineAt(body, match.index), link: `${target}#${match[2]}` });
    }
  }
  return broken;
};

const readPages = async () => {
  const entries = await Promise.all(
    listPagePaths(ROOT).map(async (file) => [
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
