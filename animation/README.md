# Climbing wall: animated 3D process

Open `index.html` in a WebGL-capable browser. All runtime assets are local; no install, network connection, or build step is needed.

A 42-second H.264 video is available at `../output/animation/climbing-wall-process.mp4`.

The 42-second sequence covers:

1. CNC drilling of the 7 × 7 grid, followed by the perimeter cut.
2. Rear installation of screw-retained T-nuts, with an enlarged connection detail.
3. Four panels moving onto a timber frame, separate panel fixings, and climbing holds bolted in from the front.

Use the chapter buttons to jump between stages. Play/pause, restart, timeline scrubbing, and playback speed are available below the model. Drag the model to orbit, scroll to zoom, and use the circular arrow to reset the camera. Space toggles playback when focus is outside a control. Reduced-motion preferences disable autoplay.

This is a conceptual process animation based on the reference illustrations in `../output/imagegen/`. Panel proportions are 1200 × 1200 × 18 mm. Hole size reflects the selected T-nut in those references. Hardware in the separate connection detail is enlarged for visibility. Frame dimensions, anchors, fastener schedules, and mat coverage are not construction specifications; these need site-specific design and manufacturer instructions.

`models.js` constructs the geometry; `app.js` handles the deterministic timeline, camera, and controls; `style.css` styles the responsive interface. Three.js is bundled in `vendor/three.min.js` under its upstream MIT license.

## Components and cost planning

The section below the animation provides a EUR estimate with adjustable panel and hold counts, purchase pack sizes, unit prices and contingency. `cost-model.js` handles quantities and integer-cent calculations; `costs.js` handles the interface and optional localStorage persistence; `costs.css` styles the planner. The animation remains the four-panel, 20-hold reference.

Reference prices were checked on 7 September 2026. Each sourced line links to the supplier; unsourced values are explicitly budget allowances. Whole sheets and packs round up, including surplus. EU value sourcing changes plywood face grade and selects the cheaper of the two complete hold-pack options for the requested quantity. Presets preserve other custom budget inputs, including freight. Neither preset assumes a negotiated wholesale discount.

Transport has separate pallet, parcel, and mat freight allowances. The mat and its freight are fixed project allowances and must be requoted for a different landing area. Structural design, paid installation and tool hire are excluded until a quote is entered.

The separate landed-cost comparison compares one complete component order against that component's current goods cost plus the entered delivery allocation. EU quotes use VAT-inclusive goods and freight. Non-EU quotes use net goods and freight, the broker's quoted duties/levies, destination VAT (Netherlands default 21%), and gross clearance fees. Blank duties/fees do not default to zero. No tariff classification or exemption is assumed. The comparison never silently alters the main budget.

## Development checks and video export

With Playwright resolvable by Node and Google Chrome installed, run `node animation/checks/browser.cjs` from the project root. This checks playback controls, frame and hole alignment, mobile layout, and reduced-motion behavior, and saves screenshots. With ffmpeg on PATH, `node animation/checks/export.cjs` renders the deterministic timeline to the MP4 at 24 fps and 1280 × 900 pixels.

Run `node --test animation/checks/cost-model.test.cjs` for calculator and landed-cost arithmetic. Run `node animation/checks/costs-browser.cjs` for price edits, pack selection, persistence, validation, freight preservation, quote comparisons, and mobile layout. Set `CLIMB_TEST_URL` to the deployed URL to run the same checks on GitHub Pages.
