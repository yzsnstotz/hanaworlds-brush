# Pinned geometry port (D-14)

Minetest-WorldEdit, revision `62ffafe3bcb386600c431ef3840d91c3c8f85639`
(abbreviated owner pin `62ffafe3`), AGPL-3.0-only.
Source: https://github.com/Uberi/Minetest-WorldEdit/tree/62ffafe3bcb386600c431ef3840d91c3c8f85639

`index.mjs` translates `worldedit/primitives.lua`'s cube, sphere, dome,
cylinder/cone, pyramid and spiral geometry. `common.lua` supplies the axis
mapping and hollow cuboid boundary. Unmodified source bytes, attribution,
license text and SHA-256 inventory live in `upstream/`.

This internal layer yields `[x,y,z]` positions and knows no materials or
orientations. Callers supply validated voxel-grid integers. Engine VoxelArea
indices and reads/writes are replaced with position generators. The original
cylinder argument compatibility branch is omitted. Solid cuboids traverse
x fastest, then y, then z; the BUILD compiler invokes them for each final
z-run in its numeric x/y/z slab sweep, preserving last-writer order and digests.
Hollow cuboids yield each boundary cell once, including thin boxes for which
the upstream iterator counts repeated writes.

Upstream geometry conventions retained:

- Cube position is its ground-level center; even dimensions bias negative.
- Spheres and domes use inclusive squared-distance thresholds `r*(r-1)` and
  `r*(r+1)`. Negative dome radius faces down and includes the equator.
- Cylinder/cone radii interpolate at `(i+1)/length` and round via
  `floor(radius+0.5)`. Negative length shifts the base by the absolute length
  and swaps the two radii.
- Signed pyramid heights retain their direction; hollow walls use the original
  two-cell threshold, `size-abs(offset)<2`.
- Spirals keep the original alternating x/z segments, spacing and last segment.

The published C-brush contract still accepts `set_box` for BUILD/V5 and an
already rasterized block for region-build/v2. Only the cuboid generator is
needed by the current compiler. The other primitives are internal source
ports; no new public operation or geometry profile is introduced. Region
partition and emptyMaterialRef continue to come from the request. D-15's
WorldEdit runtime removal is a separate decision; this port has no runtime
WorldEdit dependency.

`test/fixtures/worldedit/primitives.json` contains 117 reference cases captured
by executing the pinned original Lua source against an in-memory VoxelArea.
`npm test` compares the port with these cells without needing Lua or a world.
To regenerate the independent reference data, from the repository root:

```sh
lua test/fixtures/worldedit/generate.lua src/shapes/upstream > test/fixtures/worldedit/primitives.json
```

The test runner uses a fixed fixture-only coordinate area, stubs engine IO and
sorts captured written cells numerically. It does not translate the geometry
formulas being checked. The fixtures cover all six primitives, solid/hollow
forms, thin/even boxes, zero radius, all axes, tapered/negative cylinders,
inverted pyramids and spiral spacing.
