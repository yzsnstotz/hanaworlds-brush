import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const entry = import.meta.resolve(process.env.BRUSH_UNDER_TEST ?? '../src/index.mjs');
const shapesUrl = new URL('./shapes/index.mjs', entry);
const shapes = await import(shapesUrl).catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});
const fixture = JSON.parse(readFileSync(new URL('./fixtures/worldedit/primitives.json', import.meta.url)));
const compare = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

test('D-14 ports all six pinned primitives as pure cell generators', () => {
  for (const name of ['cube', 'sphere', 'dome', 'cylinder', 'pyramid', 'spiral', 'cuboid']) {
    assert.equal(typeof shapes[name], 'function', `${name} port missing`);
  }
});
for (const c of fixture.cases) {
  test(`pinned Lua oracle: ${c.shape} ${JSON.stringify(c.args)}`, () => {
    assert.equal(typeof shapes[c.shape], 'function', `${c.shape} port missing`);
    const before = JSON.stringify(c);
    const actual = [...shapes[c.shape](c.position, ...c.args)];
    assert.equal(new Set(actual.map(p => JSON.stringify(p))).size, actual.length, 'duplicate cell');
    // Upstream may count repeated writes for a thin hollow cuboid; cells are unique.
    assert.equal(actual.length, c.positions.length);
    assert.deepEqual(actual.sort(compare), c.positions);
    assert.deepEqual([...shapes[c.shape](c.position, ...c.args)].sort(compare), c.positions);
    assert.equal(JSON.stringify(c), before, 'input mutation');
  });
}
test('inclusive cuboid exposes the upstream x-fastest traversal and hollow boundary', () => {
  assert.equal(typeof shapes.cuboid, 'function', 'cuboid port missing');
  const lo = [-1, 4, 7], hi = [1, 6, 9];
  const solid = [...shapes.cuboid(lo, hi)];
  assert.equal(solid.length, 27);
  assert.deepEqual(solid.slice(0, 4), [[-1,4,7],[0,4,7],[1,4,7],[-1,5,7]]);
  assert.deepEqual([...shapes.cuboid(lo, hi, true)], solid.filter(p => p.some((v, a) => v === lo[a] || v === hi[a])));
  assert.deepEqual([...shapes.cuboid([2,2,2],[2,2,2],true)], [[2,2,2]]);
});
test('compiler expands final slabs through the port; opaque materials and numeric ordering survive', async () => {
  const { expandEffects } = await import(entry);
  const source = readFileSync(new URL('./expand.mjs', entry), 'utf8');
  assert.match(source, /import\s*\{\s*cuboid\s*\}\s*from\s*['"]\.\/shapes\/index\.mjs['"]/);
  const operations = [
    {op:'set_box',min:[-2,0,-1],max:[1,2,1],materialRef:'a'},
    {op:'set_box',min:[0,1,0],max:[2,1,2],materialRef:'b'},
    {op:'set_box',min:[1000000,0,0],max:[1000000,0,0],materialRef:'a'},
  ];
  const materials = {a:{materialRef:'opaque:A',orientation:23},b:{materialRef:'opaque:B',orientation:7}};
  const expected = new Map();
  // Independent per-operation enumerator, deliberately unlike the slab sweep.
  for (const op of operations) {
    for (let z=op.min[2];z<=op.max[2];z++) for (let y=op.min[1];y<=op.max[1];y++) for (let x=op.min[0];x<=op.max[0];x++) {
      const position=[x,y,z]; expected.set(JSON.stringify(position), {geometryProfile:'voxel-grid/v1',position,...materials[op.materialRef]});
    }
  }
  assert.deepEqual(expandEffects(operations,materials), [...expected.values()].sort((a,b)=>compare(a.position,b.position)));
});
test('vendor source bytes and NOTICE identify the pinned upstream and its license', () => {
  assert.equal(fixture.sourceRevision, '62ffafe3bcb386600c431ef3840d91c3c8f85639');
  const metadata = JSON.parse(readFileSync(new URL('./shapes/upstream/source.json', entry)));
  assert.equal(metadata.commit, fixture.sourceRevision);
  for (const [file, sha256] of Object.entries(metadata.sha256)) {
    assert.equal(createHash('sha256').update(readFileSync(new URL(`./shapes/upstream/${file}`, entry))).digest('hex'), sha256, file);
  }
  const notice = readFileSync(new URL('../NOTICE', entry), 'utf8');
  assert.match(notice, /Minetest-WorldEdit/);
  assert.match(notice, /62ffafe3bcb386600c431ef3840d91c3c8f85639/);
  assert.match(notice, /AGPL-3\.0/);
  assert.match(notice, /src\/shapes/);
  assert.doesNotMatch(notice, /no such port is claimed/);
});
