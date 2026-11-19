import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Shared readers for MDX page source. The anchor check and the page check use
// the same slug logic, so a link that one check accepts the other accepts too.

const FENCE = /```[\s\S]*?```/g;
const INLINE_CODE = /(`+)[^\n]*?\1/g;
const HEADING = /^#{1,6}\s+(.*)$/gm;
const EXPLICIT_ID = /\{#([\w-]+)\}\s*$/;
const TITLED_COMPONENT = /<(?:Accordion|Tab|Step)\b[^>]*\btitle="([^"]+)"/g;
const ID_ATTRIBUTE = /\bid="([^"]+)"/g;

const blank = (text) => text.replace(/[^\n]/g, "");

/** Blanks code blocks out but keeps their line breaks, so line numbers stay true. */
export const stripFences = (text) => text.replace(FENCE, blank);

/**
 * Blanks code blocks and replaces the content of each inline code span with
 * `x`. The backticks stay, so a check can still see that code was there.
 * Line numbers and columns stay true.
 */
export const stripCode = (text) =>
  stripFences(text).replace(INLINE_CODE, (span, ticks) =>
    `${ticks}${"x".repeat(span.length - 2 * ticks.length)}${ticks}`,
  );

/** The 1-based line number of a character offset. */
export const lineAt = (text, offset) => text.slice(0, offset).split("\n").length;

/** Heading slug: drop markup and punctuation, lowercase, join words with `-`. */
export const slugify = (heading) =>
  heading
    .replace(/<[^>]+>|`/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

/**
 * Each heading of a page: its line, its text without an explicit id, the id
 * that the site gives it, and whether the source sets that id explicitly.
 */
export const collectHeadings = (text) => {
  const body = stripFences(text);
  return [...body.matchAll(HEADING)].map((match) => {
    const explicit = match[1].match(EXPLICIT_ID);
    return {
      line: lineAt(body, match.index),
      text: explicit ? match[1].slice(0, explicit.index).trimEnd() : match[1],
      id: explicit ? explicit[1] : slugify(match[1]),
      explicit: explicit !== null,
    };
  });
};

/** Every anchor that a page defines, and the subset that the source sets explicitly. */
export const collectAnchorSets = (text) => {
  const body = stripFences(text);
  const all = new Set();
  const explicit = new Set();
  for (const heading of collectHeadings(text)) {
    all.add(heading.id);
    if (heading.explicit) {
      explicit.add(heading.id);
    }
  }
  for (const [, title] of body.matchAll(TITLED_COMPONENT)) {
    all.add(slugify(title));
  }
  for (const [, id] of body.matchAll(ID_ATTRIBUTE)) {
    all.add(id);
    explicit.add(id);
  }
  return { all, explicit };
};

/** Every anchor that a page defines. */
export const collectAnchors = (text) => collectAnchorSets(text).all;

/**
 * The repository paths of the MDX pages in the working tree: tracked files
 * and new files that git does not ignore.
 */
export const listPagePaths = (root) => {
  const output = execFileSync(
    "git",
    ["-C", root, "ls-files", "--cached", "--others", "--exclude-standard", "*.mdx"],
    { encoding: "utf8" },
  );
  const paths = new Set(output.split("\n").filter(Boolean));
  return [...paths].filter((path) => existsSync(resolve(root, path))).sort();
};
