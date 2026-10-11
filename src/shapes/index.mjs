// Geometry port from Minetest-WorldEdit, commit 62ffafe3bcb386600c431ef3840d91c3c8f85639.
// Copyright © 2012 sfan5, Anthony Zhang (Uberi/Temperest), Brett O'Donnell (cornernote).
// SPDX-License-Identifier: AGPL-3.0-only
// Original source and license: ./upstream; provenance and adaptation: ./README.md.
//
// Internal pure generators of integer [x,y,z] positions. Inputs are trusted
// voxel-grid integers (validated by the caller), positive cube dimensions,
// nonnegative sphere/cylinder radii and spiral spacer, nonzero pyramid height.
// Signed dome radius/cylinder length/pyramid height retain upstream semantics.
// No materials, orientation, world state or engine indexing enter this layer.

/** Inclusive solid/hollow cuboid; upstream VoxelArea x-fastest traversal. */
export function* cuboid(min, max, hollow = false) {
  for (let z = min[2]; z <= max[2]; z++) {
    for (let y = min[1]; y <= max[1]; y++) {
      for (let x = min[0]; x <= max[0]; x++) {
        // common.lua iterp_hollowcuboid's boundary, expressed without strides.
        if (!hollow || x === min[0] || x === max[0] || y === min[1] || y === max[1] || z === min[2] || z === max[2]) yield [x, y, z];
      }
    }
  }
}

/** Ground-level center; even widths/lengths are biased toward negative axes. */
export function* cube(pos, width, height, length, hollow = false) {
  const base = [pos[0] - Math.floor(width / 2), pos[1], pos[2] - Math.floor(length / 2)];
  yield* cuboid(base, [base[0] + width - 1, base[1] + height - 1, base[2] + length - 1], hollow);
}

/** Preserve upstream's r*(r±1) boundary rather than a Euclidean r*r ball. */
export function* sphere(pos, radius, hollow = false) {
  const minRadius = radius * (radius - 1), maxRadius = radius * (radius + 1);
  for (let z = -radius; z <= radius; z++) {
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        const squared = x * x + y * y + z * z;
        if (squared <= maxRadius && (!hollow || squared >= minRadius)) yield [pos[0] + x, pos[1] + y, pos[2] + z];
      }
    }
  }
}

/** A y-axis half sphere, including its equator; negative radius faces down. */
export function* dome(pos, radius, hollow = false) {
  let minY = 0, maxY = radius;
  if (radius < 0) { radius = -radius; minY = -radius; maxY = 0; }
  const minRadius = radius * (radius - 1), maxRadius = radius * (radius + 1);
  for (let z = -radius; z <= radius; z++) {
    for (let y = minY; y <= maxY; y++) {
      for (let x = -radius; x <= radius; x++) {
        const squared = x * x + y * y + z * z;
        if (squared <= maxRadius && (!hollow || squared >= minRadius)) yield [pos[0] + x, pos[1] + y, pos[2] + z];
      }
    }
  }
}

// common.lua get_axis_others, retaining its ascending order of other axes.
function axes(axis) {
  if (axis === 'x') return [0, 1, 2];
  if (axis === 'y') return [1, 0, 2];
  if (axis === 'z') return [2, 0, 1];
  throw new RangeError('Axis must be x, y, or z!');
}

/** Cylinder/cone: upstream interpolates using (i+1)/length, then rounds. */
export function* cylinder(pos, axis, length, radius1, radius2, hollow = false) {
  const [along, other1, other2] = axes(axis), base = [...pos];
  if (length < 0) {
    length = -length;
    base[along] -= length;
    [radius1, radius2] = [radius2, radius1];
  }
  for (let i = 0; i < length; i++) {
    const radius = Math.floor(radius1 + (radius2 - radius1) * (i + 1) / length + 0.5);
    const minRadius = radius * (radius - 1), maxRadius = radius * (radius + 1);
    for (let index2 = -radius; index2 <= radius; index2++) {
      for (let index3 = -radius; index3 <= radius; index3++) {
        const squared = index2 * index2 + index3 * index3;
        if (squared <= maxRadius && (!hollow || squared >= minRadius)) {
          const p = [...base]; p[along] += i; p[other1] += index2; p[other2] += index3;
          yield p;
        }
      }
    }
  }
}

/** Upstream square pyramid; hollow walls use size-abs(offset)<2. */
export function* pyramid(pos, axis, height, hollow = false) {
  const [along, other1, other2] = axes(axis);
  let step;
  if (height > 0) { height -= 1; step = 1; }
  else { height += 1; step = -1; }
  let size = Math.abs(height * step);
  for (let index1 = 0; step > 0 ? index1 <= height : index1 >= height; index1 += step) {
    for (let index2 = -size; index2 <= size; index2++) {
      for (let index3 = -size; index3 <= size; index3++) {
        if (!hollow || size - Math.abs(index2) < 2 || size - Math.abs(index3) < 2) {
          const p = [...pos]; p[along] += index1; p[other1] += index2; p[other2] += index3;
          yield p;
        }
      }
    }
    size -= 1;
  }
}

/** Vertical columns along the upstream square spiral's segment schedule. */
export function* spiral(pos, length, height, spacer) {
  const current = [...pos];
  const column = function* () {
    for (let y = 0; y < height; y++) yield [current[0], current[1] + y, current[2]];
  };
  yield* column();
  let axis = 0, other = 2, sign = -1, segmentLength = 0;
  spacer += 1;
  for (let segment = 1; segment <= Math.floor(length / spacer) * 2; segment++) {
    if (segment % 2 === 1) { sign = -sign; segmentLength += spacer; }
    for (let index = 1; index <= segmentLength; index++) {
      current[axis] += sign;
      yield* column();
    }
    [axis, other] = [other, axis];
  }
  sign = -sign;
  for (let index = 1; index <= segmentLength; index++) {
    current[axis] += sign;
    yield* column();
  }
}
