import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractReferenceImages } from "./extract-reference-images.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REFERENCE_DIR = join(REPO_ROOT, "tests/visual/reference");
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngFilesIn(flow) {
  return readdirSync(join(REFERENCE_DIR, flow)).filter((name) => name.endsWith(".png"));
}

function readPng(entry) {
  return readFileSync(join(REFERENCE_DIR, entry.file));
}

test("should extract 37 intake and 27 execution PNGs when extracting reference images", () => {
  // Given the two supplied walkthrough HTML files
  // When the extraction runs against them
  extractReferenceImages();

  // Then every walkthrough screen is written as its own PNG
  assert.equal(pngFilesIn("intake").length, 37);
  assert.equal(pngFilesIn("execution").length, 27);
});

test("should write a manifest with a valid PNG signature and IHDR dimensions for every entry", () => {
  // Given extraction has already produced a manifest
  const manifest = extractReferenceImages();

  // When each manifest entry's PNG file is read from disk
  // Then it has 64 unique entries, each backed by a real, correctly sized PNG
  assert.equal(manifest.length, 64);
  assert.equal(new Set(manifest.map((entry) => entry.id)).size, 64);

  for (const entry of manifest) {
    const buffer = readPng(entry);
    assert.deepEqual(buffer.subarray(0, 8), PNG_SIGNATURE);
    assert.equal(buffer.readUInt32BE(16), entry.width);
    assert.equal(buffer.readUInt32BE(20), entry.height);
    assert.ok(entry.width > 0 && entry.height > 0);
  }
});

test("should give every manifest entry a flow, step, state and non-empty caption", () => {
  // Given the generated manifest
  const manifest = extractReferenceImages();

  // When inspecting each entry's descriptive fields
  // Then flow is restricted to the two known walkthroughs and captions are present
  for (const entry of manifest) {
    assert.ok(entry.flow === "intake" || entry.flow === "execution");
    assert.ok(entry.step.length > 0);
    assert.ok(Number.isInteger(entry.state) && entry.state >= 0);
    assert.ok(entry.caption.length > 0);
  }
});

test("should persist the manifest to disk alongside the reference PNGs", () => {
  // Given extraction has run
  extractReferenceImages();

  // When the manifest file is read back from disk
  const onDisk = JSON.parse(readFileSync(join(REFERENCE_DIR, "manifest.json"), "utf8"));

  // Then it matches the same 64 entries the extractor returned in-memory
  assert.equal(onDisk.length, 64);
});

test("should reject extraction when the source HTML file does not exist", () => {
  // Given a walkthrough path that does not exist on disk
  const missingPath = join(REPO_ROOT, "does-not-exist.html");

  // When extraction is attempted against that path
  // Then it fails loudly instead of silently producing an empty manifest
  assert.throws(() => extractReferenceImages({ intakeHtmlPath: missingPath }), /ENOENT/);
});
