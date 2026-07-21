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

const compareToReference = (
  id: string,
  fixture: string,
  actual: PNG,
  meta: CompareMeta,
): DiffResult => {
  const source = PNG.sync.read(readFileSync(join(REFERENCE_DIR, fixture)));
  const width = Math.min(actual.width, source.width);
  const cropTop = meta.cropTopPx ?? 0;
  const height = Math.min(actual.height, source.height);
  const comparedHeight = Math.max(0, height - cropTop);
  const a = extractRegion(actual, width, height, cropTop, meta.mask);
  const b = extractRegion(source, width, height, cropTop, meta.mask);
  const diff = new PNG({ width, height: comparedHeight });
  const diffPixels = pixelmatch(a, b, diff.data, width, comparedHeight, { threshold: 0.1 });
  writeArtifacts(id, actual, diff);
  const total = width * comparedHeight || 1;
  return { ratio: diffPixels / total, diffPixels, comparedWidth: width, comparedHeight };
};

// Returns an RGBA buffer of `width` x (`height` - `cropTop`) copied from `png`,
// with any mask rectangles filled neutral so source-only overlays are ignored.
const extractRegion = (
  png: PNG,
  width: number,
  height: number,
  cropTop: number,
  masks: readonly Rect[] = [],
): Buffer => {
  const out = Buffer.alloc(width * (height - cropTop) * 4);
  copyRows(png, out, width, cropTop, height);
  for (const rect of masks) fillMask(out, width, height - cropTop, rect, cropTop);
  return out;
};

const copyRows = (png: PNG, out: Buffer, width: number, cropTop: number, height: number): void => {
  for (let y = cropTop; y < height; y += 1) {
    const srcRow = y * png.width * 4;
    const dstRow = (y - cropTop) * width * 4;
    png.data.copy(out, dstRow, srcRow, srcRow + width * 4);
  }
};

const fillMask = (out: Buffer, width: number, height: number, rect: Rect, cropTop: number): void => {
  const x1 = Math.max(0, rect.x);
  const y1 = Math.max(0, rect.y - cropTop);
  const x2 = Math.min(width, rect.x + rect.width);
  const y2 = Math.min(height, rect.y + rect.height - cropTop);
  for (let y = y1; y < y2; y += 1) {
    for (let x = x1; x < x2; x += 1) out.fill(128, (y * width + x) * 4, (y * width + x) * 4 + 4);
  }
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
