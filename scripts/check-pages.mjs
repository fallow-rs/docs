#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  collectAnchorSets,
  collectHeadings,
  lineAt,
  listPagePaths,
  stripCode,
} from "./mdx-source.mjs";

// Checks the page rules of PAGE-TYPES.md. Pages that existed before a rule
// break it, so the check compares each page with a committed baseline: a
// page may not get worse than its baseline, and a page without an entry
// must pass. See `--help` for the baseline commands.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_FILE = "scripts/check-pages.baseline.json";
const INBOUND_FILE = "scripts/inbound-links.json";
const NAVIGATION_FILE = "docs.json";

export const RULES = [
  "link-target",
  "nav-complete",
  "page-size",
  "history-text",
  "hidden-content",
  "frontmatter",
  "components",
  "ending",
  "em-dash",
  "inbound-links",
];

export const CHARACTER_LIMIT = 50_000;
const DESCRIPTION_LIMIT = 160;
const ENDING_LINK_LIMIT = 3;
const MOVED_HOP_LIMIT = 10;

/** Line budgets of the page types in PAGE-TYPES.md, by directory or root page. */
export const LINE_BUDGETS = new Map([
  ["quickstart.mdx", 150],
  ["start", 150],
  ["concepts", 200],
  ["analysis", 250],
  ["guides", 200],
  ["rules", 80],
]);

// The `ending` rule applies only to the page types that end with a short
// link list. Other pages keep their card grids until they move into a
// page-type directory.
const ENDING_SCOPES = new Set(["quickstart.mdx", "start", "concepts", "analysis", "guides", "rules"]);
const ENDING_HEADINGS = new Set(["Next", "Reference", "Related"]);

const ALLOWED_FRONTMATTER = new Set(["title", "description", "keywords", "icon", "sidebarTitle", "mode"]);
const REQUIRED_FRONTMATTER = ["title", "description"];

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

const DOCS_HOSTS = [
  { prefix: /^https?:\/\/(?:www\.)?fallow\.tools\/docs(?=\/|$)/u, base: "" },
  { prefix: /^https?:\/\/docs\.fallow\.tools(?=\/|$)/u, base: "" },
  { prefix: /^https?:\/\/docs\.fallow\.cloud(?=\/|$)/u, base: "cloud" },
];
const ASSET_DIRECTORIES = new Set(["images", "logo"]);
const LINK = /(?:\]\(|href=")([^)"\s]+)/g;
const EM_DASH = new RegExp(String.fromCodePoint(0x2014), "gu");

// Phrases that describe the history or the future of the tool. A page
// describes the tool as it is, and the changelog holds the history. Each
// pattern is narrow, because words such as "no longer" and "previously" also
// describe the code of the reader. A version needs a dot, so that "from V8"
// (the JavaScript engine) does not match.
const HISTORY_PATTERNS = [
  /\b(?:since|as of|starting with|starting in|from)\s+(?:fallow\s+)?v\d+\.\d+/giu,
  /\b(?:since|as of|starting with|starting in)\s+(?:fallow\s+)?\d+\.\d+(?:\.\d+)?\b/giu,
  /\b(?:before|after|until|prior to)\s+(?:fallow\s+v?\d+\.\d+|v\d+\.\d+)/giu,
  /\b(?:added|introduced|removed|changed|deprecated|new|available|works?)\s+in\s+(?:fallow\s+)?(?:version\s+\d+|v\d+)/giu,
  /\bin\s+fallow\s+v?\d+\.\d+/giu,
  /\bpreviously\b/giu,
  /\b(?:fallow|output|the\s+(?:tool|cli|command|option|flag|key|rule|report|action|template|extension|server))\s+no longer\b/giu,
  /\b(?:is|are)\s+now\b/giu,
  /\bnow\s+supports?\b/giu,
  /\bwill\s+be\s+(?:added|supported|available|removed)\b/giu,
  /\bcoming\s+soon\b/giu,
  /\b(?:in\s+a|a\s+later|a\s+future|planned|separate)\s+follow-up\b/giu,
  /\bfollow-up\s+(?:PRs?|pull\s+requests?|releases?|issues?|changes?)\b/giu,
];

// Phrases that contain a history word but describe the state of the code of
// the reader. The check blanks them before it applies HISTORY_PATTERNS.
const HISTORY_EXCEPTIONS = [
  /\b(?:a|an|the|any|each|every|all|no)\s+previously\s+\w+(?:ed|en)\b/giu,
];

const HIDDEN_COMPONENT = /<(?:Warning|Note|Info)\b/u;
const REQUIREMENT_LINE = /^\s*(?:[-*]\s+|\d+\.\s+)?(?:\*\*)?(?:You need|Requires|Prerequisites?)\b/u;
const CONTAINER_TAG = /<(\/?)(Accordion|Tab)\b([^>]*)>/gu;

const toLines = (text) => text.split("\n");

const trimSlashes = (path) => path.replace(/^\/+|\/+$/gu, "");

const violation = (rule, path, line, message, measure) =>
  measure === undefined ? { rule, path, line, message } : { rule, path, line, message, measure };

const pageScope = (path) => (path.includes("/") ? path.split("/")[0] : path);

// ---------------------------------------------------------------------------
// Page index

/**
 * The routes of the pages. The site serves each page at its path without
 * `.mdx`. A directory with pages and no `index.mdx` gets a generated landing
 * page, which has no headings.
 */
export const buildIndex = (pages) => {
  const routes = new Map();
  const landings = new Set();
  for (const [path, text] of pages) {
    const route = path.replace(/\.mdx$/u, "");
    routes.set(route, text);
    const segments = route.split("/");
    for (let depth = 1; depth < segments.length; depth += 1) {
      landings.add(segments.slice(0, depth).join("/"));
    }
  }
  const anchors = new Map();
  const anchorsOf = (route) => {
    if (!anchors.has(route)) {
      anchors.set(route, collectAnchorSets(routes.get(route)));
    }
    return anchors.get(route);
  };
  const resolveRoute = (route) => {
    const clean = route === "" ? "index" : route;
    if (routes.has(clean)) {
      return { route: clean, generated: false };
    }
    if (routes.has(`${clean}/index`)) {
      return { route: `${clean}/index`, generated: false };
    }
    if (landings.has(clean)) {
      return { route: clean, generated: true };
    }
    return undefined;
  };
  return { anchorsOf, resolveRoute };
};

// ---------------------------------------------------------------------------
// link-target

/**
 * Classifies a link target. `external: true` marks a page link whose anchor
 * the check does not read: a link to the cloud host or a full URL.
 */
export const parseLink = (href, ownRoute) => {
  const [withoutAnchor, anchor] = href.split("#", 2);
  const path = withoutAnchor.split("?")[0];
  if (path === "") {
    return { kind: "page", route: ownRoute, anchor, external: false };
  }
  for (const host of DOCS_HOSTS) {
    if (host.prefix.test(path)) {
      const rest = trimSlashes(path.replace(host.prefix, ""));
      if (rest.split("/").at(-1).includes(".")) {
        return { kind: "other" };
      }
      return { kind: "page", route: [host.base, rest].filter(Boolean).join("/"), anchor, external: true };
    }
  }
  if (!path.startsWith("/")) {
    return { kind: "other" };
  }
  const route = trimSlashes(path);
  if (route.split("/").at(-1).includes(".")) {
    return ASSET_DIRECTORIES.has(route.split("/")[0]) ? { kind: "asset", path: route } : { kind: "other" };
  }
  return { kind: "page", route, anchor, external: route.split("/")[0] === "cloud" };
};

const linkProblem = (link, index, assetExists) => {
  if (link.kind === "asset") {
    return assetExists(link.path) ? null : `The asset ${link.path} does not exist.`;
  }
  const target = index.resolveRoute(link.route);
  if (target === undefined) {
    return `No page serves /${link.route}. Link to an existing page.`;
  }
  if (link.anchor === undefined || link.anchor === "" || link.external) {
    return null;
  }
  if (target.generated) {
    return `/${link.route}/ is a generated landing page, and it has no heading #${link.anchor}. Link to the page that has the heading.`;
  }
  if (index.anchorsOf(target.route).all.has(link.anchor)) {
    return null;
  }
  return `/${target.route} has no heading with the id #${link.anchor}. Point the link to an existing heading, or give the heading an explicit {#${link.anchor}}.`;
};

export const checkLinks = (path, text, index, assetExists) => {
  const body = stripCode(text);
  const ownRoute = path.replace(/\.mdx$/u, "");
  const found = [];
  for (const match of body.matchAll(LINK)) {
    const link = parseLink(match[1], ownRoute);
    if (link.kind === "other") {
      continue;
    }
    const problem = linkProblem(link, index, assetExists);
    if (problem !== null) {
      found.push(violation("link-target", path, lineAt(body, match.index), problem));
    }
  }
  return found;
};

// ---------------------------------------------------------------------------
// nav-complete

const navigationPages = (docsJson) => {
  const config = JSON.parse(docsJson);
  return (config.navigation?.tabs ?? []).flatMap((tab) =>
    (tab.groups ?? []).flatMap((group) => group.pages ?? []),
  );
};

const navigationLines = (docsJson) => {
  const lines = new Map();
  toLines(docsJson).forEach((line, index) => {
    const entry = line.match(/^\s*"([^"]+)",?\s*$/u);
    if (entry) {
      lines.set(entry[1], [...(lines.get(entry[1]) ?? []), index + 1]);
    }
  });
  return lines;
};

export const checkNavigation = (pages, docsJson) => {
  const lines = navigationLines(docsJson);
  const counts = new Map();
  for (const entry of navigationPages(docsJson)) {
    counts.set(entry, (counts.get(entry) ?? 0) + 1);
  }
  const found = [];
  for (const path of pages.keys()) {
    if (!counts.has(path.replace(/\.mdx$/u, ""))) {
      found.push(violation("nav-complete", path, 1, "The page is not in docs.json. Add it to one group of the navigation."));
    }
  }
  for (const [entry, count] of counts) {
    const entryLines = lines.get(entry) ?? [1];
    if (!pages.has(`${entry}.mdx`)) {
      found.push(violation("nav-complete", NAVIGATION_FILE, entryLines[0], `docs.json lists "${entry}", but ${entry}.mdx does not exist.`));
    }
    if (count > 1) {
      found.push(violation("nav-complete", NAVIGATION_FILE, entryLines[1] ?? entryLines[0], `docs.json lists "${entry}" ${count} times. List each page once.`));
    }
  }
  return found;
};

// ---------------------------------------------------------------------------
// page-size

export const checkSize = (path, text) => {
  const found = [];
  const characters = text.length;
  if (characters > CHARACTER_LIMIT) {
    found.push(violation("page-size", path, 1, `The page has ${characters} characters. The limit is ${CHARACTER_LIMIT}. Split the page.`, { name: "characters", value: characters }));
  }
  const budget = LINE_BUDGETS.get(pageScope(path));
  const lines = toLines(text.replace(/\n$/u, "")).length;
  if (budget !== undefined && lines > budget) {
    found.push(violation("page-size", path, budget + 1, `The page has ${lines} lines. The budget of its page type is ${budget}. Move detail to the owner page, or split the page.`, { name: "lines", value: lines }));
  }
  return found;
};

// ---------------------------------------------------------------------------
// history-text

const blankMatches = (text, patterns) =>
  patterns.reduce((current, pattern) => current.replace(pattern, (match) => " ".repeat(match.length)), text);

export const checkHistory = (path, text) => {
  const body = blankMatches(stripCode(text), HISTORY_EXCEPTIONS);
  const found = [];
  for (const pattern of HISTORY_PATTERNS) {
    for (const match of body.matchAll(pattern)) {
      found.push(violation("history-text", path, lineAt(body, match.index), `"${match[0]}" describes the history or the future of the tool. Describe the tool as it is. The changelog holds the history.`));
    }
  }
  return found.sort((left, right) => left.line - right.line);
};

// ---------------------------------------------------------------------------
// hidden-content

export const checkHidden = (path, text) => {
  const found = [];
  let depth = 0;
  toLines(stripCode(text)).forEach((line, index) => {
    const depthBefore = depth;
    let opened = false;
    for (const [, closing, , attributes] of line.matchAll(CONTAINER_TAG)) {
      if (closing) {
        depth = Math.max(0, depth - 1);
      } else if (!attributes.trimEnd().endsWith("/")) {
        depth += 1;
        opened = true;
      }
    }
    if (depthBefore === 0 && depth === 0 && !opened) {
      return;
    }
    const content = line.replace(CONTAINER_TAG, "");
    if (HIDDEN_COMPONENT.test(content)) {
      found.push(violation("hidden-content", path, index + 1, "A Warning, Note or Info is inside an Accordion or a Tab. Move it out, so that each reader sees it."));
    } else if (REQUIREMENT_LINE.test(content)) {
      found.push(violation("hidden-content", path, index + 1, "A requirement is inside an Accordion or a Tab. Move it out, so that each reader sees it."));
    }
  });
  return found;
};

// ---------------------------------------------------------------------------
// frontmatter

const unquote = (value) => {
  const trimmed = value.trim();
  if (trimmed.startsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'")) {
    return trimmed.slice(1, -1).replaceAll("''", "'");
  }
  return trimmed;
};

/** The top-level keys of the YAML frontmatter, with their line numbers. `null` when the page has none. */
export const parseFrontmatter = (text) => {
  const block = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/u);
  if (!block) {
    return null;
  }
  const fields = new Map();
  toLines(block[1]).forEach((line, index) => {
    const field = line.match(/^([A-Za-z_][\w-]*):(.*)$/u);
    if (field) {
      fields.set(field[1], { line: index + 2, value: unquote(field[2]) });
    }
  });
  return fields;
};

export const checkFrontmatter = (path, text) => {
  const fields = parseFrontmatter(text);
  if (fields === null) {
    return [violation("frontmatter", path, 1, "The page has no frontmatter. Add a title and a description.")];
  }
  const found = [];
  for (const key of REQUIRED_FRONTMATTER) {
    if (!fields.has(key) || fields.get(key).value === "") {
      found.push(violation("frontmatter", path, 1, `The frontmatter has no ${key}.`));
    }
  }
  for (const [key, { line }] of fields) {
    if (!ALLOWED_FRONTMATTER.has(key)) {
      found.push(violation("frontmatter", path, line, `The site does not accept the frontmatter key "${key}". Allowed keys: ${[...ALLOWED_FRONTMATTER].join(", ")}.`));
    }
  }
  const description = fields.get("description");
  const title = fields.get("title");
  if (description !== undefined && description.value.length > DESCRIPTION_LIMIT) {
    found.push(violation("frontmatter", path, description.line, `The description has ${description.value.length} characters. The limit is ${DESCRIPTION_LIMIT}.`));
  }
  if (description !== undefined && title !== undefined && description.value.trim().toLowerCase() === title.value.trim().toLowerCase()) {
    found.push(violation("frontmatter", path, description.line, "The description repeats the title. Say what the reader gets from the page."));
  }
  return found;
};

// ---------------------------------------------------------------------------
// components

export const checkComponents = (path, text) => {
  const body = stripCode(text);
  const found = [];
  for (const match of body.matchAll(/<\/?([A-Z][A-Za-z0-9]*)/gu)) {
    if (!ALLOWED_COMPONENTS.has(match[1])) {
      found.push(violation("components", path, lineAt(body, match.index), `The site does not render the component <${match[1]}>. Use one of: ${[...ALLOWED_COMPONENTS].join(", ")}.`));
    }
  }
  return found;
};

// ---------------------------------------------------------------------------
// ending

export const checkEnding = (path, text) => {
  if (!ENDING_SCOPES.has(pageScope(path))) {
    return [];
  }
  const body = stripCode(text);
  const lastHeading = [...body.matchAll(/^## (.*)$/gmu)].at(-1);
  if (lastHeading === undefined) {
    return [];
  }
  const section = body.slice(lastHeading.index);
  const found = [];
  const cardGroup = section.search(/<CardGroup\b/u);
  if (cardGroup !== -1) {
    found.push(violation("ending", path, lineAt(body, lastHeading.index + cardGroup), "The page ends with a CardGroup. End with a list of at most 3 links under Next, Reference or Related."));
  }
  const title = collectHeadings(lastHeading[0])[0].text.trim();
  const links = [...section.matchAll(LINK)].length;
  if (ENDING_HEADINGS.has(title) && links > ENDING_LINK_LIMIT) {
    found.push(violation("ending", path, lineAt(body, lastHeading.index), `The "${title}" section has ${links} links. The limit is ${ENDING_LINK_LIMIT}.`));
  }
  return found;
};

// ---------------------------------------------------------------------------
// em-dash

export const checkEmDash = (path, text) => {
  const body = stripCode(text);
  return [...body.matchAll(EM_DASH)].map((match) =>
    violation("em-dash", path, lineAt(body, match.index), "An em dash is in the prose. Use a period, a comma, a colon or parentheses."),
  );
};

// ---------------------------------------------------------------------------
// inbound-links

const inboundFix = (anchor) =>
  anchor === undefined
    ? 'To fix it, keep the page at this path, or add the path to "moved" with the page that serves the content.'
    : `To fix it, keep the heading id with an explicit {#${anchor}}, or add the path to "moved" with the page that has the heading.`;

const followMoves = (route, moved) => {
  const seen = new Set();
  let current = route;
  while (Object.hasOwn(moved, current)) {
    if (seen.has(current) || seen.size >= MOVED_HOP_LIMIT) {
      return { route: current, loop: true };
    }
    seen.add(current);
    current = trimSlashes(String(moved[current]));
  }
  return { route: current, loop: false };
};

const inboundProblem = (entry, index, moved) => {
  const [rawPath, anchor] = entry.split("#", 2);
  const path = trimSlashes(rawPath);
  const direct = index.resolveRoute(path);
  const final = direct === undefined ? followMoves(path, moved) : { route: path, loop: false };
  if (final.loop) {
    return `"moved" has a loop at /${final.route}.`;
  }
  const target = direct ?? index.resolveRoute(final.route);
  if (target === undefined) {
    return final.route === path
      ? `No page serves /${path}.`
      : `"moved" sends /${path} to /${final.route}, but no page serves /${final.route}.`;
  }
  if (anchor === undefined) {
    return null;
  }
  if (target.generated) {
    return `/${target.route}/ is a generated landing page, and it has no heading #${anchor}.`;
  }
  const anchors = index.anchorsOf(target.route);
  if (!anchors.all.has(anchor)) {
    return `/${target.route} has no heading with the id #${anchor}.`;
  }
  if (!anchors.explicit.has(anchor)) {
    return `/${target.route} has the heading #${anchor}, but the site makes the id from the heading text, so a new heading text breaks the link.`;
  }
  return null;
};

export const checkInbound = (inboundJson, index) => {
  const inbound = JSON.parse(inboundJson);
  const moved = inbound.moved ?? {};
  const lines = toLines(inboundJson);
  const lineOf = (value) => {
    const found = lines.findIndex((line) => line.includes(`"${value}"`));
    return found === -1 ? 1 : found + 1;
  };
  const found = [];
  for (const entry of inbound.links ?? []) {
    const problem = inboundProblem(entry, index, moved);
    if (problem !== null) {
      const anchor = entry.split("#", 2)[1];
      found.push(violation("inbound-links", INBOUND_FILE, lineOf(entry), `${entry} does not resolve: ${problem} Released fallow versions link to this URL, so it must keep landing on the right place. ${inboundFix(anchor)}`));
    }
  }
  for (const [from, to] of Object.entries(moved)) {
    const target = trimSlashes(String(to));
    if (index.resolveRoute(target) === undefined && !Object.hasOwn(moved, target)) {
      found.push(violation("inbound-links", INBOUND_FILE, lineOf(from), `"moved" sends /${from} to /${target}, but no page serves /${target}. Name an existing page.`));
    }
  }
  return found;
};

// ---------------------------------------------------------------------------
// All rules

/**
 * Every violation of every rule.
 * @param {{ pages: Map<string, string>, docsJson: string, inboundJson?: string, assetExists?: (path: string) => boolean }} project
 *   `pages` maps a repository path (`cli/dupes.mdx`) to its MDX source.
 */
export const checkProject = ({ pages, docsJson, inboundJson, assetExists = () => true }) => {
  const index = buildIndex(pages);
  const found = [];
  for (const [path, text] of pages) {
    found.push(
      ...checkLinks(path, text, index, assetExists),
      ...checkSize(path, text),
      ...checkHistory(path, text),
      ...checkHidden(path, text),
      ...checkFrontmatter(path, text),
      ...checkComponents(path, text),
      ...checkEnding(path, text),
      ...checkEmDash(path, text),
    );
  }
  found.push(...checkNavigation(pages, docsJson));
  if (inboundJson !== undefined) {
    found.push(...checkInbound(inboundJson, index));
  }
  return found;
};

// ---------------------------------------------------------------------------
// Baseline

/**
 * The baseline of a list of violations. A count rule records the number of
 * violations per file. `page-size` records the measured size per file.
 */
export const buildBaseline = (violations) => {
  const rules = Object.fromEntries(RULES.map((rule) => [rule, {}]));
  for (const found of violations) {
    const entries = rules[found.rule];
    entries[found.path] =
      found.measure === undefined
        ? (entries[found.path] ?? 0) + 1
        : { ...entries[found.path], [found.measure.name]: found.measure.value };
  }
  for (const rule of RULES) {
    rules[rule] = Object.fromEntries(
      Object.entries(rules[rule]).sort(([left], [right]) => left.localeCompare(right)),
    );
  }
  return { rules };
};

// Flattens a baseline to `[rule, path, measure]` keys with numbers, so that
// counts and sizes compare in one way. A count has the measure `count`.
const flatten = (baseline) => {
  const values = new Map();
  for (const [rule, entries] of Object.entries(baseline.rules ?? {})) {
    for (const [path, value] of Object.entries(entries)) {
      const measures = typeof value === "number" ? { count: value } : value;
      for (const [measure, size] of Object.entries(measures)) {
        values.set(JSON.stringify([rule, path, measure]), size);
      }
    }
  }
  return values;
};

const byRuleAndPath = (left, right) =>
  RULES.indexOf(left.rule) - RULES.indexOf(right.rule) || left.path.localeCompare(right.path);

const differences = (from, to) => {
  const found = [];
  for (const [key, value] of from) {
    const limit = to.get(key) ?? 0;
    if (value > limit) {
      const [rule, path, measure] = JSON.parse(key);
      found.push({ rule, path, measure, value, limit });
    }
  }
  return found.sort(byRuleAndPath);
};

/**
 * Compares the current violations with a baseline. `worse` lists the
 * entries above the baseline. `stale` lists the baseline entries that are
 * higher than the current state. `--update-baseline` lowers them.
 */
export const compareBaseline = (violations, baseline) => {
  const current = flatten(buildBaseline(violations));
  const allowed = flatten(baseline);
  const worse = differences(current, allowed);
  const stale = differences(allowed, current).map(({ value, limit, ...entry }) => ({
    ...entry,
    value: limit,
    limit: value,
  }));
  return { worse, stale };
};

/** Per rule: the violations that the baseline covers, the files they are in, and the violations above it. */
export const summarize = (violations, worse) =>
  RULES.map((rule) => {
    const failing = new Set(worse.filter((entry) => entry.rule === rule).map((entry) => entry.path));
    const ofRule = violations.filter((found) => found.rule === rule);
    const covered = ofRule.filter((found) => !failing.has(found.path));
    return {
      rule,
      baseline: covered.length,
      files: new Set(covered.map((found) => found.path)).size,
      new: ofRule.length - covered.length,
    };
  });

const describeEntry = ({ rule, path, measure, value, limit }) =>
  measure === "count"
    ? `${path}: [${rule}] ${value} found, the baseline allows ${limit}`
    : `${path}: [${rule}] ${value} ${measure}, the baseline allows ${limit}`;

// ---------------------------------------------------------------------------
// Command line

const HELP = `Usage: node scripts/check-pages.mjs [--update-baseline [--allow-regression]]

Checks each page against the rules of PAGE-TYPES.md and ${BASELINE_FILE}.

  --update-baseline   Write the current violations to ${BASELINE_FILE}.
                      Refuses to raise a number, so the baseline only shrinks.
  --allow-regression  With --update-baseline: also raise numbers.`;

/** Parses the command-line flags. Throws on an unknown flag. */
export const parseArguments = (args) => {
  const known = new Set(["--update-baseline", "--allow-regression", "--help"]);
  for (const arg of args) {
    if (!known.has(arg)) {
      throw new Error(`Unknown argument: ${arg}. Use --update-baseline, --allow-regression or --help.`);
    }
  }
  if (args.includes("--allow-regression") && !args.includes("--update-baseline")) {
    throw new Error("--allow-regression works only with --update-baseline.");
  }
  return {
    help: args.includes("--help"),
    update: args.includes("--update-baseline"),
    allowRegression: args.includes("--allow-regression"),
  };
};

/**
 * The baseline to write for `--update-baseline`. Without `allowRegression`,
 * it refuses when a number goes up, so a baseline can only shrink.
 */
export const nextBaseline = (violations, baseline, allowRegression) => {
  const { worse } = compareBaseline(violations, baseline);
  if (worse.length > 0 && !allowRegression) {
    return { ok: false, worse };
  }
  return { ok: true, baseline: buildBaseline(violations) };
};

const readBaseline = async () => {
  try {
    return JSON.parse(await readFile(resolve(ROOT, BASELINE_FILE), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return { rules: {} };
    }
    throw error;
  }
};

const readProject = async () => {
  const pages = new Map(
    await Promise.all(
      listPagePaths(ROOT).map(async (path) => [path, await readFile(resolve(ROOT, path), "utf8")]),
    ),
  );
  return {
    pages,
    docsJson: await readFile(resolve(ROOT, NAVIGATION_FILE), "utf8"),
    inboundJson: await readFile(resolve(ROOT, INBOUND_FILE), "utf8"),
    assetExists: (path) => existsSync(resolve(ROOT, path)),
  };
};

const printSummary = (rows) => {
  console.log(`${"Rule".padEnd(16)}${"In baseline (files)".padEnd(22)}New`);
  for (const row of rows) {
    console.log(`${row.rule.padEnd(16)}${`${row.baseline} (${row.files})`.padEnd(22)}${row.new}`);
  }
};

const update = async (violations, baseline, allowRegression) => {
  const next = nextBaseline(violations, baseline, allowRegression);
  if (!next.ok) {
    console.error(`${BASELINE_FILE} did not change, because these entries would go up:`);
    for (const entry of next.worse) {
      console.error(`  ${describeEntry(entry)}`);
    }
    console.error("Fix the new violations. To accept them on purpose, add --allow-regression.");
    process.exitCode = 1;
    return;
  }
  await writeFile(resolve(ROOT, BASELINE_FILE), `${JSON.stringify(next.baseline, null, 2)}\n`);
  console.log(`Wrote ${BASELINE_FILE}.`);
  printSummary(summarize(violations, []));
};

const check = (violations, baseline) => {
  const { worse, stale } = compareBaseline(violations, baseline);
  const failing = new Set(worse.map((entry) => `${entry.rule}\0${entry.path}`));
  for (const found of violations) {
    if (failing.has(`${found.rule}\0${found.path}`)) {
      console.error(`${found.path}:${found.line}: [${found.rule}] ${found.message}`);
    }
  }
  for (const entry of worse) {
    console.error(describeEntry(entry));
  }
  for (const entry of stale) {
    console.error(`${describeEntry(entry)}. The page is better than its baseline: run node scripts/check-pages.mjs --update-baseline.`);
  }
  printSummary(summarize(violations, worse));
  if (worse.length > 0 || stale.length > 0) {
    process.exitCode = 1;
    return;
  }
  console.log("Each page is within its baseline.");
};

const run = async () => {
  const args = parseArguments(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }
  const violations = checkProject(await readProject());
  const baseline = await readBaseline();
  if (args.update) {
    await update(violations, baseline, args.allowRegression);
    return;
  }
  check(violations, baseline);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
