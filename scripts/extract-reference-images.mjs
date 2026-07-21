import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const STEP_PATTERN = /<section class="step" id="([^"]+)">([\s\S]*?)<\/section>/g;
const FIGURE_PATTERN =
  /<figure class="slide[^"]*"><img src="data:image\/png;base64,([^"]+)" alt=""><figcaption>([^<]*)<\/figcaption><\/figure>/g;

const DEFAULT_PATHS = {
  intakeHtmlPath: "/Users/abubakar/Desktop/fineos-mock/FINEOS_notification_intake_walkthrough.html",
  executionHtmlPath: "/Users/abubakar/Desktop/fineos-mock/FINEOS_case_execution_walkthrough.html",
  referenceDir: join(REPO_ROOT, "tests/visual/reference"),
};

function readPngDimensions(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("Extracted figure is not a valid PNG");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function findSteps(html) {
  return [...html.matchAll(STEP_PATTERN)].map(([, id, body]) => ({ id, body }));
}

function findFigures(stepBody) {
  return [...stepBody.matchAll(FIGURE_PATTERN)].map(([, base64, caption]) => ({
    buffer: Buffer.from(base64, "base64"),
    caption,
  }));
}

function toManifestEntry({ flow, stepId, state, caption, buffer, file }) {
  const { width, height } = readPngDimensions(buffer);
  return { id: `${flow}-${stepId}-${state}`, flow, step: stepId, state, width, height, caption, file };
}

function extractStep({ flow, step, outDir }) {
  return findFigures(step.body).map((figure, state) => {
    const filename = `${step.id}-${state}.png`;
    writeFileSync(join(outDir, filename), figure.buffer);
    const file = `${flow}/${filename}`;
    return toManifestEntry({ flow, stepId: step.id, state, caption: figure.caption, buffer: figure.buffer, file });
  });
}

function extractFlow({ flow, htmlPath, referenceDir }) {
  const outDir = join(referenceDir, flow);
  mkdirSync(outDir, { recursive: true });
  const html = readFileSync(htmlPath, "utf8");
  return findSteps(html).flatMap((step) => extractStep({ flow, step, outDir }));
}

export function extractReferenceImages(options = {}) {
  const paths = { ...DEFAULT_PATHS, ...options };
  const intake = extractFlow({ flow: "intake", htmlPath: paths.intakeHtmlPath, referenceDir: paths.referenceDir });
  const execution = extractFlow({ flow: "execution", htmlPath: paths.executionHtmlPath, referenceDir: paths.referenceDir });
  const manifest = [...intake, ...execution];
  writeFileSync(join(paths.referenceDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const manifest = extractReferenceImages();
  console.log(`Extracted ${manifest.length} reference images.`);
}
