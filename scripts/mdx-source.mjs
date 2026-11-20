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
/**
 * The number of lines of `text` outside its fenced code blocks. The lines of
 * a code block and its two fence lines do not count.
 */
export const countLinesOutsideCode = (text) => {
  let inFence = false;
  let count = 0;
  for (const line of text.split("\n")) {
    if (/^\s*```/u.test(line)) {
      inFence = !inFence;
    } else if (!inFence) {
      count += 1;
    }
  }
  return count;
};

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

// ---------------------------------------------------------------------------
// MDX syntax
//
// The site compiles each page as MDX. MDX reads a `<` as the start of a JSX
// tag and a `{` as the start of an expression, so a bare one in the prose
// stops the build of the site. This lint is conservative: it accepts only the
// constructs that the pages need, and it needs no MDX compiler.

/** The components that the site renders. */
export const ALLOWED_COMPONENTS = new Set([
  "Accordion",
  "Card",
  "CardGroup",
  "Check",
  "CodeGroup",
  "Icon",
  "Info",
  "Note",
  "Step",
  "Steps",
  "Tab",
  "Tabs",
  "Tip",
  "Tooltip",
  "Warning",
]);

/** The HTML elements that a page can write as JSX. */
export const HTML_TAGS = new Set([
  "a", "b", "blockquote", "br", "code", "dd", "details", "div", "dl", "dt",
  "em", "figcaption", "figure", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i",
  "iframe", "img", "kbd", "li", "ol", "p", "picture", "pre", "small", "source",
  "span", "strong", "sub", "summary", "sup", "table", "tbody", "td", "th",
  "thead", "tr", "u", "ul", "video",
]);

const VOID_TAGS = new Set(["br", "hr", "img", "source"]);
const FRONTMATTER = /^---\n[\s\S]*?\n---\n/u;
const MDX_COMMENT = /\{\/\*[\s\S]*?\*\/\}/gu;
const CODE_SPAN = /(`+)(?!`)[^\n]*?(?<!`)\1(?!`)/gu;
const ESCAPE = /\\[\\<>{}]/gu;
const HEADING_ID = /(^#{1,6}[ \t].*?)([ \t]\{#[\w-]+\}[ \t]*)$/gmu;
const AUTOLINK = /^<(?:https?:\/\/|mailto:)[^\s<>]+>/u;
const TAG_START = /^<(\/?)([A-Za-z][\w.]*)/u;
const MODULE_LINE = /^(?:import|export)\s/gmu;

const spaces = (text) => text.replace(/[^\n]/gu, " ");

/** Blanks every construct that MDX accepts, so that each `<`, `{` or `}` left is bare. */
const blankAccepted = (text) =>
  text
    .replace(FRONTMATTER, spaces)
    .replace(/```[\s\S]*?```/gu, spaces)
    .replace(MDX_COMMENT, spaces)
    .replace(ESCAPE, spaces)
    .replace(CODE_SPAN, spaces)
    .replace(HEADING_ID, (_, heading, id) => `${heading}${spaces(id)}`);

/** The end offset (after `>`) of the tag that starts at `start`, or -1. */
const tagEnd = (text, start) => {
  let depth = 0;
  let quote = null;
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index];
    if (quote !== null) {
      quote = char === quote ? null : quote;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
    } else if (char === ">" && depth === 0) {
      return index + 1;
    } else if (char === "<" && depth === 0) {
      return -1;
    }
  }
  return -1;
};

const knownTag = (name) => ALLOWED_COMPONENTS.has(name) || HTML_TAGS.has(name);

/**
 * Each bare `<`, `{` or `}` and each `import` or `export` line that MDX would
 * read as code: outside code blocks, code spans, MDX comments, escapes,
 * explicit heading ids, known tags and autolinks. It also reports a known
 * tag that the page opens more often than it closes, or the reverse.
 * @returns {{ line: number, message: string }[]}
 */
export const findBareMdx = (text) => {
  const body = blankAccepted(text);
  const found = [];
  const report = (offset, message) => found.push({ offset, line: lineAt(body, offset), message });
  const balance = new Map();
  let index = 0;
  while (index < body.length) {
    const char = body[index];
    if (char === "<") {
      const rest = body.slice(index, index + 200);
      const autolink = rest.match(AUTOLINK);
      const tag = rest.match(TAG_START);
      if (autolink !== null) {
        index += autolink[0].length;
        continue;
      }
      const end = tag === null ? -1 : tagEnd(body, index);
      if (tag === null || !knownTag(tag[2]) || end === -1) {
        report(index, `MDX reads this "<" as a JSX tag: "${text.slice(index, index + 30).split("\n")[0]}". Write it in backticks, or escape it as \\<.`);
        index += 1;
        continue;
      }
      const selfClosing = body.slice(index, end).endsWith("/>") || VOID_TAGS.has(tag[2]);
      if (!selfClosing) {
        const entry = balance.get(tag[2]) ?? { count: 0, offset: index };
        entry.count += tag[1] === "/" ? -1 : 1;
        balance.set(tag[2], entry);
      }
      index = end;
      continue;
    }
    if (char === "{" || char === "}") {
      report(index, `MDX reads this "${char}" as a JavaScript expression: "${text.slice(Math.max(0, index - 10), index + 20).split("\n").at(-1)}". Write it in backticks, or escape it as \\${char}.`);
    }
    index += 1;
  }
  for (const [name, { count, offset }] of balance) {
    if (count !== 0) {
      report(offset, `The page opens <${name}> ${count > 0 ? "more" : "less"} often than it closes it. MDX fails on an unclosed tag. Close it, or write it in backticks.`);
    }
  }
  for (const match of body.matchAll(MODULE_LINE)) {
    report(match.index, `MDX reads a line that starts with "${match[0].trim()}" as a JavaScript module statement. Reword the line, or write the word in backticks.`);
  }
  return found.sort((left, right) => left.offset - right.offset).map(({ line, message }) => ({ line, message }));
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
