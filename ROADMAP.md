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
      - Show pictures ✅
        - Show OTHER: 999 G
      - Edit picture properties
    - Mask with texture
      - Masks: maskbig, maskhor, masklitt, masktop
      - brick 750 G
      - ground 800 G
      - sky 800 S
      - stone1 750 G
      - stone2 750 G
      - stone3 750 S
  - Polygon properties:
    - Show grass pictures
      - Grass polygon always has an inactive line, the one which is longest in the x direction. The other lines determine the lower border of the grass (the upper border is determined by the normal polygons).
    - Create grass polygon
    - Convert polygon to grass or normal polygon
  - Level properties:
    - Foreground (with distance?)
    - Background (with distance?)
    - Level name
    - LGR file
  - View options:
    - View Polygons
    - View Grass
    - View Pictures
  - Check Topology (see above section)
    - Error: Two lines are intersecting each others!
      After this dialog you will see the intersection.
      Use Zoom-out to see where it is located!
    - Everything seems to be all right.
  - Zoom level info.
  - Delete tool
    - Cannot delete Start object or last Exit object.

- Show defaults for object, start and images while loading.

- Better save changes affordance.
  - Track latest downloaded state vs current state and show an alert on close if unsaved.
  - Save state to local storage and show a recover message on init. One entry per tab and show a dialog with recover or clear up saved state.

- Mobile support:
  - Touch gestures for pan/zoom
  - Erase tool
  - Mobile toolbar (drawer)

- Help section / keyboard shortcuts reference

- AI Assistant
- Custom LGR support

## Other

- Zoom +/- should be linear (not relative to current zoom level)
- Custom lev folder management with preview thumbnails
- Multi-player level editor
- Version history info
- Export to SVG
- Starter templates dropdown
  - Internal editor
  - Web editor
  - Custom
  - See settings
