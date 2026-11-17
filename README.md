# dsh-cv-warm

Local-only DSH client plugin.

1. Gives transcript markdown containers `content-visibility: auto` +
   `contain-intrinsic-size: auto 800px`, so offscreen blocks skip layout and
   compositing. This is what makes session switches and streaming cheap on
   transcripts with thousands of KaTeX nodes.
2. Keeps a band of ~2 viewports around the scrollport switched to
   `content-visibility: visible` via IntersectionObserver, so blocks are rendered
   *before* they scroll into view (removes the reveal hitch) and fall back to
   `auto` once they leave the band (so nothing accumulates).

Verify: `window.__cvWarm` → `{ installed: true, blocks, warmed }`
Disable: `window.__cvWarm.off()`
