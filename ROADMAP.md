# Roadmap

Ideas and plans for Elma Web Editor.

## Level correctness

Topology validity

- Ensure vertices aren’t overlapping or too close.
- Detect duplicate vertices.

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

## Feedback

- Instead of canceling add polygon on changing tool, add it.
- Save and Save as do same thing for me (just download lev)
- can't set lev folder (nothing happens)
- im on Firefox
- zoom steps are too close for my liking (too many klicks required to zoom in/out)
- edit: just realised ctr+mwheel zooms 👌
- hotkeys would be nice
- edit: just realised there are hotkeys already
- petition to change P (Polygon) to V (Vertex) because P is very far away and V is hardwired into my hand
- after selecting a poly or vertex
- https://elma.online/levels/606953 this crashes because there's two vertices too close to each other (in this case at the exact same spot, since the vertices seem to snap to the closest .1), and there's no topology checking

## Planned features

- AI Assistant
  // TODO: update with in-game editor pics folder
- Match features set of in-game editor:
  - Pictures:
    - Normal Picture (with distance)
    - Texture (with mask and distance)
  - General help dialog
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
  - Zoom level info (match in-game zoom levels)

## Future ideas

- Mobile support:
  - Touch gestures for pan/zoom
  - Mobile toolbar updates?
  - Erase tool?
- Export to SVG
