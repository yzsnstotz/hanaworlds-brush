// Exact expansion of ordered inclusive set_box operations into final effects.
//
// Semantics are the frozen BUILD/V2 + compilation-config/v2 rules:
// last-writer-wins on overlap, one effect per written cell, numeric x,y,z order,
// no compression, no rounding, no truncation. The sweep below works on
// coordinate slabs so that empty space between distant boxes is never visited,
// and it emits effects already in final order (no global sort or cell map).

/** Sorted unique slab cuts for one axis: every box min and max+1. */
function cutsFor(operations, axis) {
  const cuts = new Set();
  for (const op of operations) { cuts.add(op.min[axis]); cuts.add(op.max[axis] + 1); }
  return [...cuts].sort((a, b) => a - b);
}

/** Bounds of all written cells, i.e. the exact union bounds of the ordered writes. */
export function unionBounds(operations) {
  const min = [...operations[0].min], max = [...operations[0].max];
  for (const op of operations) for (let a = 0; a < 3; a++) {
    if (op.min[a] < min[a]) min[a] = op.min[a];
    if (op.max[a] > max[a]) max[a] = op.max[a];
  }
  return { min, max };
}

/**
 * Expand ordered set_box writes. `materials` maps materialRef to NodeSpec and
 * must already be validated to contain every referenced materialRef.
 * Returns effects ordered by numeric x, then y, then z.
 */
export function expandEffects(operations, materials) {
  const xs = cutsFor(operations, 0), ys = cutsFor(operations, 1), zs = cutsFor(operations, 2);
  const slab = (cuts, value) => {
    // exact binary search; value is always a member of cuts
    let lo = 0, hi = cuts.length - 1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (cuts[mid] === value) return mid; if (cuts[mid] < value) lo = mid + 1; else hi = mid - 1; }
    throw new Error('brush: slab cut missing');
  };
  const spans = operations.map((op, index) => ({
    index, spec: materials[op.materialRef],
    x0: slab(xs, op.min[0]), x1: slab(xs, op.max[0] + 1),
    y0: slab(ys, op.min[1]), y1: slab(ys, op.max[1] + 1),
    z0: slab(zs, op.min[2]), z1: slab(zs, op.max[2] + 1),
  }));
  const effects = [];
  for (let xi = 0; xi + 1 < xs.length; xi++) {
    const inX = spans.filter(s => s.x0 <= xi && xi < s.x1);
    if (inX.length === 0) continue;
    // Per y-slab z-winners for this x-slab; later operations overwrite earlier ones.
    const rows = [];
    for (let yi = 0; yi + 1 < ys.length; yi++) {
      const inXY = inX.filter(s => s.y0 <= yi && yi < s.y1);
      if (inXY.length === 0) continue;
      const winners = new Array(zs.length - 1).fill(null);
      for (const s of inXY) for (let zi = s.z0; zi < s.z1; zi++) winners[zi] = s.spec;
      rows.push({ yi, winners });
    }
    for (let x = xs[xi]; x < xs[xi + 1]; x++) {
      for (const { yi, winners } of rows) {
        for (let y = ys[yi]; y < ys[yi + 1]; y++) {
          for (let zi = 0; zi < winners.length; zi++) {
            const spec = winners[zi];
            if (spec === null) continue;
            for (let z = zs[zi]; z < zs[zi + 1]; z++) effects.push({ position: [x, y, z], nodeName: spec.nodeName, param2: spec.param2 });
          }
        }
      }
    }
  }
  return effects;
}
