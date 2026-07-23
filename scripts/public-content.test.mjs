import assert from "node:assert/strict";
import { mkdtemp, mkdir, symlink, utimes, writeFile } from "node:fs/promises";
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
  const first = await createArchive({
    root,
    outputDirectory: "first",
    sourceCommit: "0123456789abcdef",
  });
  const second = await createArchive({
    root,
    outputDirectory: "second",
    sourceCommit: "0123456789abcdef",
  });

  assert.equal(first.artifact.sha256, second.artifact.sha256);
  assert.equal(first.source.content_sha256, second.source.content_sha256);
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

test("public content rejects private repository links", async () => {
  const root = await createFixture();
  await writeFile(
    join(root, "analysis", "health.mdx"),
    "See https://github.com/fallow-rs/fallow-cloud/tree/main/internal\n",
  );

  await assert.rejects(
    buildManifest(root),
    /Found private cloud repository link/u,
  );
});

test("public content rejects high-confidence credentials", async () => {
  const root = await createFixture();
  await writeFile(
    join(root, "analysis", "health.mdx"),
    `Leaked key: ghp_${"a".repeat(36)}\n`,
  );

  await assert.rejects(
    buildManifest(root),
    /Found GitHub access token/u,
  );
});
