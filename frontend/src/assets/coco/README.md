# Coco brand assets (source files)

These are the **source/spec assets** for the Coco mascot — standalone SVGs per
pose, the raw sprite, and the ASCII set. They are not imported by the app.

**The live implementation is `src/components/coco/Coco.tsx`**, which inlines
the same sprite and exposes `<CocoSprite/>` (mount once near the app root),
`<Coco state=... size=.../>`, `<FeelingChip/>`, and `<CocoGlyph/>`.

If the mascot design changes, update BOTH the SVGs here and the inline sprite
in `Coco.tsx` — they must stay in sync. The standalone SVGs exist for use
outside the React app (favicons, og-images, docs, print).

Poses: listening, asking, reflecting, encouraging, hopeful, supportive (wide,
two figures), celebrating, waiting, safety. Feeling tokens (user-side, not
Coco): sad, overwhelmed, unheard, lonely, angry.

Recolor via CSS vars on any ancestor: `--coco-fill / --coco-line /
--coco-fiber / --coco-blush / --coco-shade` (hue presets in `COCO_HUES`).
The leaf animation needs the `coco-leaf` keyframes from `src/index.css`.
