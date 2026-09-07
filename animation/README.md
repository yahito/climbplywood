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

## Development checks and video export

With Playwright resolvable by Node and Google Chrome installed, run `node animation/checks/browser.cjs` from the project root. This checks playback controls, frame and hole alignment, mobile layout, and reduced-motion behavior, and saves screenshots. With ffmpeg on PATH, `node animation/checks/export.cjs` renders the deterministic timeline to the MP4 at 24 fps and 1280 × 900 pixels.
