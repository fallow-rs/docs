#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const REPOSITORY_URL = "https://github.com/fallow-rs/docs";
const SOURCE_REF = "main";
const MANIFEST_NAME = "public-content-manifest.json";
const ARCHIVE_NAME = "fallow-public-docs.tar.gz";
const PROVENANCE_NAME = "fallow-public-docs.provenance.json";
const REQUIRED_FILES = ["docs.json", "index.mdx"];
const PUBLIC_ROOT_FILES = new Set([
  ".mintignore",
  "adoption.mdx",
  "context7.json",
  "custom.css",
  "docs.json",
  "favicon.svg",
  "index.mdx",
  "installation.mdx",
  "quickstart.mdx",
]);
const CONTENT_DIRECTORIES = new Set([
  "analysis",
  "cli",
  "cloud",
  "configuration",
  "explanations",
  "frameworks",
  "integrations",
  "migration",
  "snippets",
]);
const ASSET_DIRECTORIES = new Set(["images", "logo"]);
const REPOSITORY_ONLY_DIRECTORIES = new Set([
  ".agents",
  ".claude",
  ".fallow",
  ".git",
  ".github",
  ".plans",
  "dist",
  "launch-content",
  "node_modules",
  "scripts",
  "skills",
]);
const ASSET_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
]);
const LEAK_MARKERS = [
  {
    label: "private cloud documentation path",
    pattern: /(?:^|[^\w-])fallow-cloud\/internal\//u,
  },
  {
    label: "private documentation alias",
    pattern: /(?:^|[^\w-])\.internal\//u,
  },
  {
    label: "private cloud repository link",
    pattern:
      /(?:^|[^A-Za-z0-9-])github\.com\.?(?::\d+)?(?::|\/)+fallow-rs\/fallow-cloud(?:\.git)?(?=$|[^A-Za-z0-9._-])/iu,
  },
  {
    label: "machine-local macOS path",
    pattern: /\/Users\/[^/\s]+\/[^/\s]+/u,
  },
  {
    label: "machine-local Windows path",
    pattern: /[A-Za-z]:\\Users\\[^\\\s]+\\/u,
  },
  {
    label: "private key material",
    pattern: /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/u,
  },
  {
    label: "GitHub access token",
    pattern: /gh[pousr]_[A-Za-z0-9]{36,}/u,
  },
  {
    label: "AWS access key",
    pattern: /AKIA[0-9A-Z]{16}/u,
  },
  {
    label: "live Stripe secret key",
    pattern: /sk_live_[A-Za-z0-9]{20,}/u,
  },
];

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(SCRIPT_DIRECTORY, "..");

const toPosixPath = (path) => path.split(sep).join("/");

const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

const extensionOf = (path) => {
  const index = path.lastIndexOf(".");
  return index === -1 ? "" : path.slice(index).toLowerCase();
};

const walkDirectory = async (root, directory, extensions) => {
  const absoluteDirectory = join(root, directory);
  let entries;

  try {
    entries = await readdir(absoluteDirectory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const files = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const absolutePath = join(absoluteDirectory, entry.name);
    const repositoryPath = toPosixPath(relative(root, absolutePath));
    const metadata = await lstat(absolutePath);

    if (metadata.isSymbolicLink()) {
      throw new Error(`Public content cannot contain symlinks: ${repositoryPath}`);
    }

    if (metadata.isDirectory()) {
      files.push(
        ...(await walkDirectory(root, repositoryPath, extensions)),
      );
      continue;
    }

    if (!metadata.isFile()) {
      throw new Error(`Unsupported public content entry: ${repositoryPath}`);
    }

    if (!extensions.has(extensionOf(entry.name))) {
      throw new Error(`Unsupported public content file type: ${repositoryPath}`);
    }

    files.push(repositoryPath);
  }

  return files;
};

const findUnownedMdx = async (root, directory = "") => {
  const absoluteDirectory = join(root, directory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const repositoryPath = toPosixPath(join(directory, entry.name));
    const topLevelDirectory = repositoryPath.split("/")[0];

    if (entry.isDirectory()) {
      if (REPOSITORY_ONLY_DIRECTORIES.has(topLevelDirectory)) {
        continue;
      }
      files.push(...(await findUnownedMdx(root, repositoryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".mdx")) {
      const isOwnedRootPage =
        !repositoryPath.includes("/") && PUBLIC_ROOT_FILES.has(repositoryPath);
      const isOwnedDirectory =
        CONTENT_DIRECTORIES.has(topLevelDirectory);
      if (!isOwnedRootPage && !isOwnedDirectory) {
        files.push(repositoryPath);
      }
    }
  }

  return files.sort();
};

const validateLeakMarkers = (path, content) => {
  const text = content.toString("utf8");
  for (const marker of LEAK_MARKERS) {
    if (marker.pattern.test(text)) {
      throw new Error(`Found ${marker.label} in public content: ${path}`);
    }
  }
};

export const collectPublicFiles = async (root = DEFAULT_ROOT) => {
  const files = [];

  for (const path of [...PUBLIC_ROOT_FILES].sort()) {
    try {
      const metadata = await lstat(join(root, path));
      if (metadata.isSymbolicLink()) {
        throw new Error(`Public content cannot contain symlinks: ${path}`);
      }
      if (!metadata.isFile()) {
        throw new Error(`Public content entry is not a file: ${path}`);
      }
      files.push(path);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  for (const directory of [...CONTENT_DIRECTORIES].sort()) {
    files.push(
      ...(await walkDirectory(root, directory, new Set([".mdx"]))),
    );
  }

  for (const directory of [...ASSET_DIRECTORIES].sort()) {
    files.push(...(await walkDirectory(root, directory, ASSET_EXTENSIONS)));
  }

  for (const path of REQUIRED_FILES) {
    if (!files.includes(path)) {
      throw new Error(`Required public content file is missing: ${path}`);
    }
  }

  const unownedMdx = await findUnownedMdx(root);
  if (unownedMdx.length > 0) {
    throw new Error(
      `MDX files outside the public allowlist: ${unownedMdx.join(", ")}`,
    );
  }

  return [...new Set(files)].sort();
};

export const buildManifest = async (root = DEFAULT_ROOT) => {
  const paths = await collectPublicFiles(root);
  const files = [];
  const aggregate = createHash("sha256");

  for (const path of paths) {
    const content = await readFile(join(root, path));
    validateLeakMarkers(path, content);
    const digest = sha256(content);
    files.push({
      path,
      bytes: content.byteLength,
      sha256: digest,
    });
    aggregate.update(path);
    aggregate.update("\0");
    aggregate.update(digest);
    aggregate.update("\0");
    aggregate.update(String(content.byteLength));
    aggregate.update("\n");
  }

  return {
    schema_version: 1,
    source: {
      repository: REPOSITORY_URL,
      ref: SOURCE_REF,
      content_root: ".",
      visibility: "public-only",
    },
    content: {
      sha256: aggregate.digest("hex"),
      files,
    },
  };
};

const formatJson = (value) => `${JSON.stringify(value, null, 2)}\n`;

export const writeManifest = async (root = DEFAULT_ROOT) => {
  const manifest = await buildManifest(root);
  await writeFile(join(root, MANIFEST_NAME), formatJson(manifest));
  return manifest;
};

export const checkManifest = async (root = DEFAULT_ROOT) => {
  const generated = formatJson(await buildManifest(root));
  let committed;

  try {
    committed = await readFile(join(root, MANIFEST_NAME), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `${MANIFEST_NAME} is missing. Run npm run content:manifest.`,
      );
    }
    throw error;
  }

  if (committed !== generated) {
    throw new Error(
      `${MANIFEST_NAME} is stale. Run npm run content:manifest.`,
    );
  }

  return JSON.parse(generated);
};

const writeOctal = (header, offset, length, value) => {
  const encoded = value.toString(8).padStart(length - 1, "0");
  header.write(encoded, offset, length - 1, "ascii");
  header[offset + length - 1] = 0;
};

const createTarHeader = (path, size) => {
  const pathBytes = Buffer.byteLength(path);
  if (pathBytes > 100) {
    throw new Error(`Archive path exceeds the ustar limit: ${path}`);
  }

  const header = Buffer.alloc(512);
  header.write(path, 0, pathBytes, "utf8");
  writeOctal(header, 100, 8, 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, size);
  writeOctal(header, 136, 12, 0);
  header.fill(0x20, 148, 156);
  header.write("0", 156, 1, "ascii");
  header.write("ustar", 257, 5, "ascii");
  header[262] = 0;
  header.write("00", 263, 2, "ascii");

  let checksum = 0;
  for (const byte of header) {
    checksum += byte;
  }
  const encodedChecksum = checksum.toString(8).padStart(6, "0");
  header.write(encodedChecksum, 148, 6, "ascii");
  header[154] = 0;
  header[155] = 0x20;
  return header;
};

export const createTar = (entries) => {
  const chunks = [];
  for (const entry of [...entries].sort((left, right) =>
    left.path.localeCompare(right.path),
  )) {
    const content = Buffer.isBuffer(entry.content)
      ? entry.content
      : Buffer.from(entry.content);
    chunks.push(createTarHeader(entry.path, content.byteLength), content);
    const remainder = content.byteLength % 512;
    if (remainder !== 0) {
      chunks.push(Buffer.alloc(512 - remainder));
    }
  }
  chunks.push(Buffer.alloc(1024));
  return Buffer.concat(chunks);
};

export const createArchive = async ({
  root = DEFAULT_ROOT,
  outputDirectory,
  sourceCommit,
}) => {
  if (!/^[0-9a-f]{40}$/u.test(sourceCommit ?? "")) {
    throw new Error(
      "Archive creation requires --source-commit with a full commit SHA.",
    );
  }

  const manifest = await checkManifest(root);
  const head = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (head !== sourceCommit) {
    throw new Error(`Archive source commit ${sourceCommit} does not match checkout HEAD ${head}.`);
  }
  const publicationPaths = [MANIFEST_NAME, ...manifest.content.files.map((file) => file.path)];
  const dirtyPublicationPaths = execFileSync(
    "git",
    ["-C", root, "status", "--porcelain", "--untracked-files=all", "--", ...publicationPaths],
    { encoding: "utf8" },
  ).trim();
  if (dirtyPublicationPaths !== "") {
    throw new Error("Archive publication inputs must be tracked and clean.");
  }
  const sourceProvenance = {
    schema_version: 1,
    source: {
      ...manifest.source,
      commit: sourceCommit,
      content_sha256: manifest.content.sha256,
    },
  };
  const entries = [];

  for (const file of manifest.content.files) {
    const content = await readFile(join(root, file.path));
    if (
      content.byteLength !== file.bytes ||
      sha256(content) !== file.sha256
    ) {
      throw new Error(
        `Public content changed while creating the archive: ${file.path}`,
      );
    }
    entries.push({
      path: `content/${file.path}`,
      content,
    });
  }
  entries.push(
    {
      path: MANIFEST_NAME,
      content: formatJson(manifest),
    },
    {
      path: "source-provenance.json",
      content: formatJson(sourceProvenance),
    },
  );

  const archive = gzipSync(createTar(entries), {
    level: 9,
    mtime: 0,
  });
  const absoluteOutputDirectory = resolve(root, outputDirectory);
  await mkdir(absoluteOutputDirectory, { recursive: true });
  await writeFile(join(absoluteOutputDirectory, ARCHIVE_NAME), archive);

  const artifactProvenance = {
    ...sourceProvenance,
    artifact: {
      filename: ARCHIVE_NAME,
      bytes: archive.byteLength,
      sha256: sha256(archive),
    },
  };
  await writeFile(
    join(absoluteOutputDirectory, PROVENANCE_NAME),
    formatJson(artifactProvenance),
  );

  return artifactProvenance;
};

const parseArguments = (arguments_) => {
  const result = {
    mode: "--check",
    outputDirectory: null,
    sourceCommit: process.env.GITHUB_SHA ?? null,
  };

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--check" || argument === "--write") {
      result.mode = argument;
      continue;
    }
    if (argument === "--archive") {
      result.mode = argument;
      result.outputDirectory = arguments_[index + 1];
      index += 1;
      continue;
    }
    if (argument === "--source-commit") {
      result.sourceCommit = arguments_[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  if (result.mode === "--archive" && !result.outputDirectory) {
    throw new Error("--archive requires an output directory.");
  }
  return result;
};

const run = async () => {
  const arguments_ = parseArguments(process.argv.slice(2));
  if (arguments_.mode === "--write") {
    const manifest = await writeManifest();
    console.log(
      `Wrote ${MANIFEST_NAME} for ${manifest.content.files.length} public files.`,
    );
    return;
  }
  if (arguments_.mode === "--archive") {
    const provenance = await createArchive({
      outputDirectory: arguments_.outputDirectory,
      sourceCommit: arguments_.sourceCommit,
    });
    console.log(
      `Wrote ${provenance.artifact.filename} (${provenance.artifact.sha256}).`,
    );
    return;
  }

  const manifest = await checkManifest();
  console.log(
    `${MANIFEST_NAME} is current (${manifest.content.sha256}).`,
  );
};

const isEntryPoint =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntryPoint) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
