import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildManifest,
  checkManifest,
  createArchive,
  writeManifest,
} from "./public-content.mjs";

const createFixture = async () => {
  const root = await mkdtemp(join(tmpdir(), "fallow-public-content-"));
  await mkdir(join(root, "analysis"));
  await writeFile(join(root, "docs.json"), "{}\n");
  await writeFile(join(root, "index.mdx"), "# Fallow\n");
  await writeFile(join(root, "analysis", "health.mdx"), "# Health\n");
  return root;
};

const commitFixture = (root) => {
  execFileSync("git", ["-C", root, "init", "--quiet"]);
  execFileSync("git", ["-C", root, "add", "."]);
  execFileSync("git", [
    "-C",
    root,
    "-c",
    "user.name=Public Docs Test",
    "-c",
    "user.email=public-docs@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "test fixture",
  ]);
  return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
};

test("manifest order and digest do not depend on file timestamps", async () => {
  const root = await createFixture();
  const first = await buildManifest(root);
  await utimes(
    join(root, "analysis", "health.mdx"),
    new Date("2030-01-01T00:00:00Z"),
    new Date("2030-01-01T00:00:00Z"),
  );
  const second = await buildManifest(root);

  assert.deepEqual(second, first);
  assert.deepEqual(
    first.content.files.map((file) => file.path),
    ["analysis/health.mdx", "docs.json", "index.mdx"],
  );
});

test("archive output is reproducible for the same content and commit", async () => {
  const root = await createFixture();
  await writeManifest(root);
  const sourceCommit = commitFixture(root);
  const first = await createArchive({
    root,
    outputDirectory: "first",
    sourceCommit,
  });
  const second = await createArchive({
    root,
    outputDirectory: "second",
    sourceCommit,
  });

  const committedManifest = JSON.parse(
    await readFile(join(root, "public-content-manifest.json"), "utf8"),
  );

  assert.equal(first.artifact.sha256, second.artifact.sha256);
  assert.equal(first.source.commit, sourceCommit);
  assert.equal(first.source.content_sha256, committedManifest.content.sha256);
});

test("archive rejects public content that is not committed", async () => {
  const root = await createFixture();
  await writeManifest(root);
  const sourceCommit = commitFixture(root);
  await writeFile(join(root, "analysis", "draft.mdx"), "# Draft\n");
  await writeManifest(root);

  await assert.rejects(
    createArchive({ root, outputDirectory: "archive", sourceCommit }),
    /untracked or changed:\n(?:.*\n)*\?\? analysis\/draft\.mdx/u,
  );
});

test("archive rejects provenance that differs from checkout HEAD", async () => {
  const root = await createFixture();
  await writeManifest(root);
  commitFixture(root);

  await assert.rejects(
    createArchive({
      root,
      outputDirectory: "archive",
      sourceCommit: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    }),
    /does not match checkout HEAD/u,
  );
});

test("check mode rejects content drift", async () => {
  const root = await createFixture();
  await writeManifest(root);
  await writeFile(join(root, "analysis", "health.mdx"), "# Changed health\n");

  await assert.rejects(
    checkManifest(root),
    /public-content-manifest\.json is stale/u,
  );
});

test("public content rejects symlinks", async () => {
  const root = await createFixture();
  await symlink(
    join(root, "analysis", "health.mdx"),
    join(root, "analysis", "linked.mdx"),
  );

  await assert.rejects(
    buildManifest(root),
    /Public content cannot contain symlinks: analysis\/linked\.mdx/u,
  );
});

test("public content rejects MDX outside the allowlist", async () => {
  const root = await createFixture();
  await mkdir(join(root, "internal"));
  await writeFile(join(root, "internal", "roadmap.mdx"), "# Roadmap\n");

  await assert.rejects(
    buildManifest(root),
    /MDX files outside the public allowlist: internal\/roadmap\.mdx/u,
  );
});

test("public content rejects private documentation markers", async () => {
  const root = await createFixture();
  await writeFile(
    join(root, "analysis", "health.mdx"),
    "Read fallow-cloud/internal/runbook.md\n",
  );

  await assert.rejects(
    buildManifest(root),
    /Found private cloud documentation path/u,
  );
});

test("public content rejects a backtick-wrapped plain private root", async () => {
  const root = await createFixture();
  await writeFile(
    join(root, "analysis", "health.mdx"),
    "Read `internal/runbook.md`\n",
  );

  await assert.rejects(
    buildManifest(root),
    /Found plain private documentation root/u,
  );
});

test("public content rejects links to non-public Fallow decisions", async () => {
  const root = await createFixture();
  await writeFile(
    join(root, "analysis", "health.mdx"),
    "See https://github.com/fallow-rs/fallow/blob/main/decisions/private.md\n",
  );

  await assert.rejects(
    buildManifest(root),
    /Found non-public Fallow decision link/u,
  );
});

test("public content rejects private repository links", async () => {
  const urls = [
    "https://github.com/fallow-rs/fallow-cloud",
    "https://www.github.com/fallow-rs/fallow-cloud.git",
    "https://token@github.com/fallow-rs/fallow-cloud.git",
    "//github.com/fallow-rs/fallow-cloud",
    "ssh://git@github.com/fallow-rs/fallow-cloud.git",
    "git@github.com:fallow-rs/fallow-cloud.git",
    "git://github.com/fallow-rs/fallow-cloud.git",
    "https://github.com:443/fallow-rs/fallow-cloud.git",
    "ssh://git@github.com:22/fallow-rs/fallow-cloud.git",
    "https://github.com./fallow-rs/fallow-cloud.git",
  ];
  for (const url of urls) {
    const root = await createFixture();
    await writeFile(join(root, "analysis", "health.mdx"), `Clone ${url}\n`);
    await assert.rejects(
      buildManifest(root),
      /Found private cloud repository link/u,
    );
  }
});

test("public content rejects a private repository link in markdown link syntax", async () => {
  const root = await createFixture();
  await writeFile(
    join(root, "analysis", "health.mdx"),
    "See [private repository](https://github.com/fallow-rs/fallow-cloud)\n",
  );

  await assert.rejects(
    buildManifest(root),
    /Found private cloud repository link/u,
  );
});

test("public content rejects each leak marker", async () => {
  const cases = [
    ["See .internal/runbook.md", /Found private documentation alias/u],
    ["Open /Users/alex/project", /Found machine-local macOS path/u],
    ["Open C:\\Users\\alex\\project", /Found machine-local Windows path/u],
    [
      `-----BEGIN ${"RSA"} PRIVATE KEY-----`,
      /Found private key material/u,
    ],
    [`Leaked key: ghp_${"a".repeat(36)}`, /Found GitHub access token/u],
    [`Leaked key: AKIA${"A".repeat(16)}`, /Found AWS access key/u],
    [`Leaked key: sk_live_${"a".repeat(24)}`, /Found live Stripe secret key/u],
  ];
  for (const [text, expected] of cases) {
    const root = await createFixture();
    await writeFile(join(root, "analysis", "health.mdx"), `${text}\n`);
    await assert.rejects(buildManifest(root), expected);
  }
});

test("public content accepts text near the leak markers", async () => {
  const root = await createFixture();
  await writeFile(
    join(root, "analysis", "health.mdx"),
    "Read src/internal-api.ts and https://github.com/fallow-rs/fallow\n",
  );

  const manifest = await buildManifest(root);
  assert.ok(
    manifest.content.files.some((file) => file.path === "analysis/health.mdx"),
  );
});

test("public content rejects unsupported file types", async () => {
  const root = await createFixture();
  await writeFile(join(root, "analysis", "notes.txt"), "notes\n");

  await assert.rejects(
    buildManifest(root),
    /Unsupported file type in public content: analysis\/notes\.txt/u,
  );
});
