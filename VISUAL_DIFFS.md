# Visual Fidelity — Documented Differences

`npm run test:visual` renders every one of the 64 reference states at its exact
captured dimensions, compares the AdminSuite content against the source PNG in
`tests/visual/reference/`, and writes `<id>.actual.png` / `<id>.diff.png` plus
`report.json` to `tests/visual/results/`. Comparison uses `pixelmatch`
(per-pixel threshold `0.1`); the reported ratio is the fraction of **comparable**
pixels that differ — masked pixels are excluded from the denominator (see below).

The sources are real FINEOS product screenshots captured inside a browser and a
screen-recording session. This mock is semantic DOM/CSS, not a bitmap replay, so
it is **not** a pixel clone: font family, hinting, antialiasing, sub-pixel text
metrics, and live/third-party content always differ at the glyph edges. **No
screen is claimed as pixel-exact.** The DOM is built to match hierarchy,
geometry, and content, and the residual per-state difference is dominated by
that unavoidable text-rendering delta.

## Thresholds by category

Three budgets are in force (`report.json` uses only these):

| Category | Limit | States | Why the residual exists |
| --- | --- | --- | --- |
| Plain AdminSuite screen | **10%** | 44 | Structural/content match; residual is font/AA/sub-pixel positioning only. |
| Dialog, modal, or open listbox | **15%** | 17 | The dimmed backdrop and OS-drawn `<select>` popups can't be reproduced in a DOM screenshot; the semantic dialog/field is rendered and diffed. |
| External stand-in site | **25%** | 3 | Third-party pages (uKnow, Google, ICD10Data) with live ads/photos; the in-app lookup is a deterministic stand-in, not a clone. |

Current results: **all 64 pass**, max **23.7%** (`execution-s9-1`, external, 25%
limit), median **≈9.0%**. There is no 40/85/90/95/100% budget; any such earlier
claim is obsolete and has been removed.

## Comparison methodology

- **Crop (`cropTopPx`)** strips source-only browser/OS window chrome (tabs + URL
  bar) from the **top of the source only**; the mock's content top is then
  aligned to the first source content row. Used by the access captures
  (`intake-s0-0..s1-3`).
- **Region (`region`)** restricts the diff to the comparable content rectangle
  for genuine child windows / dialogs whose surrounding parent frame is not part
  of the state under evaluation. It is a scoping device, **not** a way to hide
  unmatched AdminSuite content: the two states reworked in this pass
  (`execution-s5-0`, `intake-s3-0`) carry **no region crop** and are scored on
  the full frame so their newly added content is counted.
- **Mask (`mask`)** fills genuine source-only artifacts neutral in **both**
  images before diffing, and those pixels are subtracted from the denominator so
  the ratio reflects only comparable pixels. Masks cover only: the red
  screen-recording capture borders, the floating video-call panel, the bottom
  recording toolbar, and a source-only browser preview popup. Masks never cover
  AdminSuite content that is visible in the source.

## Genuine source-only / unreproducible states

### External lookup sites (deterministic in-app stand-ins, 25%)
- `execution-s8-0` — UNUM Inside / uKnow knowledge base.
- `execution-s9-0` — Google search results (live AI overview, ads, thumbnails).
- `execution-s9-1` — ICD10Data.com (rotating ad banners and sponsor photos).

The journey routes through `/lookups/*` so it never depends on external services;
these pages reproduce the relevant ICD-10 content, not the third-party layout.

### OS-drawn native dropdown popups (15%; closed field compared)
- `intake-s2-1`, `intake-s8-1`, `intake-s8-3`, `execution-s7-3`.

The mock uses real `<select>` elements; their expanded popups are drawn by the
operating system and cannot appear in a DOM screenshot, so the diff sees the
closed field.

### Dialog / modal overlays (15%; content rendered, backdrop-dominated)
- `intake-s1-1`, `intake-s6-3`, `intake-s12-0`.
- `execution-s1-1`, `execution-s1-2`, `execution-s11-0..3`.

An equivalent semantic dialog is rendered; the dimmed backdrop plus differing
FINEOS modal geometry keep it within the 15% budget rather than 10%.

## Source chrome handled by crop / mask
- **Browser window chrome** (tabs + URL bar) above `intake-s1-0..s1-3` is cropped
  via `cropTopPx`; `intake-s0-0` (login) compares the AdminSuite card + backdrop.
- **Screen-recording overlays** on the execution captures — the red capture
  border, the floating video-call panel, the bottom recording toolbar — are
  masked in both images so they never count against AdminSuite content.

## Semantic-DOM caveats on the reworked states
- `execution-s5-0` (Party Profile): the five-column panel packing, Address
  Details / HOME block, and source field spacing are reproduced and scored on the
  full frame (video-call panel masked). The exact masonry column heights and
  screenshot glyph rendering are not pixel-identical, which is the source of the
  residual ~9% difference.
- `intake-s3-0` (Occupation Details): all occupation fields (work site, work-site
  address, organisation unit, occupation category, employee ID, job strenuous,
  the Unverified/Verified/Reverify controls) and the Reporting Administrative
  Group block are rendered and scored full-frame; residual is font/positioning.

## Reproducing
```
npm run test:visual          # renders, compares, writes results/ + report.json
open tests/visual/results/report.json   # per-state ratio, threshold, pass/fail
```
