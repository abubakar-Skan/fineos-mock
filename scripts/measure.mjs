import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

// Usage: node scripts/measure.mjs <file> col <x> | row <y>
const [file, mode, at] = process.argv.slice(2);
const png = PNG.sync.read(readFileSync(file));
const { width, height, data } = png;
const px = (x, y) => {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
};
const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
const fmt = (c) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;

console.log(`${file} ${width}x${height}`);
if (mode === "col") {
  const x = Number(at);
  let prev = px(x, 0);
  for (let y = 1; y < height; y += 1) {
    const c = px(x, y);
    if (dist(c, prev) > 40) { console.log(`y=${y}\t${fmt(prev)} -> ${fmt(c)}`); prev = c; }
  }
} else if (mode === "row") {
  const y = Number(at);
  let prev = px(0, y);
  for (let x = 1; x < width; x += 1) {
    const c = px(x, y);
    if (dist(c, prev) > 40) { console.log(`x=${x}\t${fmt(prev)} -> ${fmt(c)}`); prev = c; }
  }
} else if (mode === "avg") {
  const [x0, y0, x1, y1] = process.argv.slice(4).map(Number);
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
    const c = px(x, y); r += c[0]; g += c[1]; b += c[2]; n += 1;
  }
  console.log(`avg[${x0},${y0}-${x1},${y1}] = ${fmt([Math.round(r/n), Math.round(g/n), Math.round(b/n)])}`);
}
