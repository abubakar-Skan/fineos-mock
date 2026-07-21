import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { expect, test } from "@playwright/test";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { visualStates, type CompareMeta, type Rect } from "./visual-state-map";

const HERE = dirname(fileURLToPath(import.meta.url));
const REFERENCE_DIR = join(HERE, "reference");
const RESULTS_DIR = join(HERE, "results");
const ROWS_DIR = join(RESULTS_DIR, "rows");

interface DiffResult {
  readonly ratio: number;
  readonly diffPixels: number;
  readonly comparedWidth: number;
  readonly comparedHeight: number;
  readonly maskedPixels: number;
}

interface ReportRow extends DiffResult {
  readonly id: string;
  readonly flow: string;
  readonly threshold: number;
  readonly passed: boolean;
  readonly sourceOnly: boolean;
  readonly note?: string;
}

test.beforeAll(() => mkdirSync(ROWS_DIR, { recursive: true }));

test.beforeEach(async ({ request }) => {
  await request.post("/api/test/reset");
});

for (const state of visualStates) {
  test(`${state.id} — ${state.caption}`, async ({ page }) => {
    await page.setViewportSize(state.viewport);
    await state.prepare?.(page);
    await page.waitForTimeout(250);
    const actual = PNG.sync.read(await page.screenshot());
    const result = compareToReference(state.id, state.fixture, actual, state.compare);
    recordRow(state, result);
    expect(
      result.ratio,
      `${state.id}: ${(result.ratio * 100).toFixed(1)}% of AdminSuite pixels differ (limit ${(state.compare.maxDiffRatio * 100).toFixed(0)}%). ${state.compare.note ?? ""}`,
    ).toBeLessThanOrEqual(state.compare.maxDiffRatio);
  });
}

test.afterAll(() => writeReport());

// Compares the mock render against the source. `cropTopPx` strips source-only
// browser/OS chrome from the TOP of the SOURCE only, then the mock's content top
// (row 0) is aligned to the first source content row. Masked regions cover
// source-only artifacts (video overlays, capture borders): they are filled
// neutral in BOTH buffers (never counted as differing) and removed from the
// denominator, so the ratio reflects only comparable content-region pixels.
const compareToReference = (
  id: string,
  fixture: string,
  actual: PNG,
  meta: CompareMeta,
): DiffResult => {
  const source = PNG.sync.read(readFileSync(join(REFERENCE_DIR, fixture)));
  const cropTop = meta.cropTopPx ?? 0;
  const region = meta.region ?? { x: 0, y: 0, width: actual.width, height: actual.height };
  const width = Math.min(region.width, actual.width - region.x, source.width - region.x);
  const height = Math.max(0, Math.min(region.height, actual.height - region.y, source.height - cropTop - region.y));
  const a = sliceRect(actual, region.x, region.y, width, height);
  const b = sliceRect(source, region.x, cropTop + region.y, width, height);
  const masks = translateMasks(meta.mask ?? [], region);
  const masked = applyMasks(a, b, width, height, masks);
  return diffBuffers(id, actual, a, b, width, height, masked);
};

const sliceRect = (png: PNG, srcLeft: number, srcTop: number, width: number, height: number): Buffer => {
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const srcRow = ((y + srcTop) * png.width + srcLeft) * 4;
    png.data.copy(out, y * width * 4, srcRow, srcRow + width * 4);
  }
  return out;
};

const translateMasks = (masks: readonly Rect[], region: Rect): readonly Rect[] =>
  masks.map((mask) => ({ ...mask, x: mask.x - region.x, y: mask.y - region.y }));

// Fills mask rectangles neutral in both buffers; returns the masked pixel count.
const applyMasks = (a: Buffer, b: Buffer, width: number, height: number, masks: readonly Rect[]): number => {
  const covered = new Uint8Array(width * height);
  for (const rect of masks) markRect(covered, width, height, rect);
  let count = 0;
  for (let i = 0; i < covered.length; i += 1) if (covered[i]) count += fillNeutral(a, b, i);
  return count;
};

const markRect = (covered: Uint8Array, width: number, height: number, rect: Rect): void => {
  const x2 = Math.min(width, rect.x + rect.width);
  const y2 = Math.min(height, rect.y + rect.height);
  for (let y = Math.max(0, rect.y); y < y2; y += 1) {
    for (let x = Math.max(0, rect.x); x < x2; x += 1) covered[y * width + x] = 1;
  }
};

const fillNeutral = (a: Buffer, b: Buffer, pixel: number): number => {
  a.fill(128, pixel * 4, pixel * 4 + 4);
  b.fill(128, pixel * 4, pixel * 4 + 4);
  return 1;
};

const diffBuffers = (
  id: string, actual: PNG, a: Buffer, b: Buffer, width: number, height: number, masked: number,
): DiffResult => {
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(a, b, diff.data, width, height, { threshold: 0.1 });
  writeArtifacts(id, actual, diff);
  const total = Math.max(1, width * height - masked);
  return { ratio: diffPixels / total, diffPixels, comparedWidth: width, comparedHeight: height, maskedPixels: masked };
};

const writeArtifacts = (id: string, actual: PNG, diff: PNG): void => {
  writeFileSync(join(RESULTS_DIR, `${id}.actual.png`), PNG.sync.write(actual));
  writeFileSync(join(RESULTS_DIR, `${id}.diff.png`), PNG.sync.write(diff));
};

// Each test writes its own row file so the aggregated report survives worker
// restarts (module globals reset on restart; files on disk do not).
const recordRow = (state: (typeof visualStates)[number], result: DiffResult): void => {
  const row: ReportRow = {
    id: state.id,
    flow: state.flow,
    threshold: state.compare.maxDiffRatio,
    passed: result.ratio <= state.compare.maxDiffRatio,
    sourceOnly: state.compare.sourceOnly ?? false,
    note: state.compare.note,
    ...result,
  };
  writeFileSync(join(ROWS_DIR, `${state.id}.json`), JSON.stringify(row));
};

const writeReport = (): void => {
  const rows = readdirSync(ROWS_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(join(ROWS_DIR, name), "utf8")) as ReportRow)
    .sort((left, right) => left.id.localeCompare(right.id));
  writeFileSync(join(RESULTS_DIR, "report.json"), `${JSON.stringify(rows, null, 2)}\n`);
  for (const row of rows) {
    const flag = row.passed ? "PASS" : "FAIL";
    console.log(`${flag} ${row.id} ${(row.ratio * 100).toFixed(1)}% (limit ${(row.threshold * 100).toFixed(0)}%)`);
  }
};
