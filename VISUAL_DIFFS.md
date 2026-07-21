# Visual Fidelity — Documented Differences

`npm run test:visual` renders every one of the 64 reference states at its exact
captured dimensions, compares the AdminSuite content against the source PNG in
`tests/visual/reference/`, and writes `<id>.actual.png` / `<id>.diff.png` plus
`report.json` to `tests/visual/results/`. Comparison uses `pixelmatch`
(per-pixel threshold 0.1); the reported ratio is the fraction of pixels that
differ over the compared region.

The sources are real FINEOS product screenshots captured inside a browser and a
screen-recording session. This mock is semantic DOM/CSS, so it is **not** a
pixel clone: fonts, antialiasing, sub-pixel metrics, live data, browser chrome,
and third-party sites will always differ. **No screen is claimed as pixel-exact.**
Plain AdminSuite screens land at 7–29% differing pixels and are held to a **40%**
limit. The states below need a wider, explicitly-named allowance because part of
the source frame is genuinely outside what the mock reproduces.

## Thresholds by category

| Category | Limit | Why the source can't be matched full-frame |
| --- | --- | --- |
| Plain AdminSuite (45 states) | 40% | Structural match; residual is font/AA/positioning only. |
| Native `<select>` popup | 85% | The open dropdown is drawn by the OS, not the DOM — uncapturable. Closed field compared. |
| Dialog / modal overlay | 90% | The overlay dims the whole page, so full-frame diff is backdrop-dominated; modal content is rendered but geometry differs. |
| Unmodelled FINEOS screen | 95% | A distinct downstream screen the mock does not build. |
| External website | 100% | Third-party site with live ads/photos; the in-app lookup is a deterministic stand-in. |

## Genuine source-only / unreproducible states

### External lookup sites (deterministic in-app stand-ins)
- `execution-s8-0` — UNUM Inside / uKnow knowledge base.
- `execution-s9-0` — Google search results (live AI overview, ads, thumbnails).
- `execution-s9-1` — ICD10Data.com (rotating ad banners and sponsor photos).

The journey routes through `/lookups/*` so it never depends on external services;
these pages reproduce the relevant ICD-10 content, not the third-party layout.

### OS-drawn native dropdown popups (closed field compared)
- `intake-s2-1` — Notification source dropdown open.
- `intake-s8-1` — Medical condition dropdown open.
- `intake-s8-3` — Hospitalization overnight-stay dropdown open.
- `execution-s7-3` — GDC Condition Category dropdown open.

The mock uses real `<select>` elements; their expanded popups are rendered by the
operating system and cannot appear in a DOM screenshot.

### Dialog / modal overlays (content rendered, backdrop-dominated)
- `intake-s1-1` — Case Search dialog over the dashboard.
- `intake-s6-3` — Add Absence Period modal.
- `intake-s12-0` — Choose Medical Provider modal.
- `execution-s1-1`, `execution-s1-2` — Case Search dialog (Case / Recent tabs).
- `execution-s11-0..3` — Provider search / details / Add Person modal.

These render an equivalent semantic dialog, but the dimmed backdrop plus the
differing FINEOS modal geometry means most full-frame pixels differ.

### Unmodelled downstream screens (approximated)
- `intake-s13-3` — GDC "Challenge Wrap-Up" screen (95% limit; distinct screen).
- `intake-s13-1`, `intake-s13-2` — post-submit Notification Summary / Leave-Plan
  eligibility screens. These pass the 40% limit as the confirmation summary but
  are approximations of separate FINEOS screens, not clones.
- `execution-s4-0` — QuestionPathClaim eForm viewer; the mock shows the Documents
  tab it opens from.

## Source chrome handled by crop / mask
- **Browser window chrome** (tabs + URL bar) above `intake-s1-0..s1-3` is skipped
  via `cropTopPx`; `intake-s0-0` (login) is the AdminSuite card inside a full
  browser frame and is compared on the card + backdrop only.
- **Screen-recording overlay** — a red capture border and a video-call widget on
  the right edge appear on the execution captures. Both regions are filled
  neutral in the source and the render (`mask`) before diffing so they do not
  count against the AdminSuite content.

## Reproducing
```
npm run test:visual          # renders, compares, writes results/ + report.json
open tests/visual/results/report.json   # per-state ratio, threshold, pass/fail
```
