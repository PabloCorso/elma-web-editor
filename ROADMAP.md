# Roadmap

Ideas and plans for Elma Web Editor.

## Level correctness

Topology validity

- Ensure vertices aren’t overlapping or too close.
- Detect duplicate vertices.
- Make sure that level width and height are <= 188

originally both vertices were at (16.4, 7.2), editor moved the other one to (16.400202, 7.2002801666666665)
looks like there's some rng, in insguy's fixed version it moved to (16.400261666666665, 7.200239666666667)
the above was me testing
tiny changes anyway
oke this is what it actually does

```
if |vertex1.x - vertex2.x| < 0.0000002 and |vertex1.y - vertex2.y| < 0.0000002
vertex1.x += 0.0002 + 0.0002 _ rand(1000)/1200.0
vertex1.y += 0.0002 + 0.0002 _ rand(1000)/1200.0
```

Default in-game lev polygon = (-24, -8), (24, -8), (24, 2), (-24, 2)

## Planned features

- LGR support

- Match features set of in-game editor:
  - General help dialog
  - Apple properties:
    - Normal Food ✅
    - Gravity Up ✅
    - Gravity Down ✅
    - Gravity Left ✅
    - Gravity Right ✅
    - Food anim number (1-9) ✅
  - Food anim number:
    - Add support for 1-9 food animation numbers. Default LGR use 1-2, use modulo for higher numbers.
  - Update food properties:
    - In-game set right clicking apple with move tool
  - Pictures:
    - Right click to select picture or mask with texture and left click to place.
    - Right click the picture or texture to set properties.
    - Normal picture
      - barrel 380 S
      - bridge 400 U
      - bush1 550 S
      - bush2 550 S
      - bush3 440 S
      - cliff 400 S
      - edge 440 U
      - flag 450 S
      - hang 434 S
      - log1 420 S
      - log1 420 S
      - log2 420 S
      - mushroom 430 S
      - plantain 450 U
      - secret 550 S
      - sedge 430 S
      - st3top 740 S
      - supphred 380 S
      - support1 380 U
      - support2 380 U
      - support2 380 U
      - support3 380 U
      - suppvred 380 S
      - susp 380 U
      - suspdown 380 U
      - suspup 380 U
      - tree1 550 S
      - tree2 540 S
      - tree3 560 S
      - tree4 600 S
      - tree4 600 S
      - tree5 600 S
      - OTHER: 999 G
    - Mask with texture
      - Masks: maskbig, maskhor, masklitt, masktop
      - brick 750 G
      - ground 800 G
      - sky 800 S
      - stone1 750 G
      - stone2 750 G
      - stone3 750 S
    - Picture properties info:
      - Default: Distance Clipping
      - Current: (1-999) (U, S, G)
      - S = Sky: only those parts of the picture are drawn that are in the sky.
      - G = Ground: only those parts of the picture are drawn that are in the ground.
      - U = Unclipped.
  - Polygon properties:
    - Grass
    - A grass polygon always has an inactive line, the one which is longest in the x direction. The other lines determine the lower border of the grass (the upper border is determined by the normal polygons).
  - Level properties:
    - Foreground (with distance?)
    - Background (with distance?)
    - Level name
    - LGR file
  - View options:
    - View Polygons
    - View Grass
    - View Pictures
  - Check Topology
    - Error: Two lines are intersecting each others!
      After this dialog you will see the intersection.
      Use Zoomout to see where it is located!
    - Everything seems to be all right.
  - Zoom level info.
  - Delete tool
    - Cannot delete Start object or last Exit object.

- Help section / keyboard shortcuts reference

- Mobile support:
  - Touch gestures for pan/zoom
  - Erase tool
  - Mobile toolbar

- AI Assistant

## Other

- Zoom +/- should be linear (not relative to current zoom level)
- Custom lev folder management with preview thumbnails
- Export to SVG
