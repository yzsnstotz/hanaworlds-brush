// The one place that names the hanaworlds-contracts dependency this Brush admits.
// package.json "imports" map #contracts to the installed hanaworlds-contracts dependency, declared as the
// contracts source git `#semver:` range below; ADMITTED_CONTRACTS is that range, not a commit or byte pin.
// Tests, preview and tools/verify-contracts-artifact.mjs locate contracts only through here,
// so raising the floor is: this range + the package.json dependency, then `npm install`.
export const ADMITTED_CONTRACTS = Object.freeze({
  name: 'hanaworlds-contracts', range: '^2.0.0-rc.1',
  source: 'https://github.com/yzsnstotz/hanaworlds-contracts',
});
/** URL of the contracts entry module Brush itself imports as #contracts. */
export const contractsUrl = import.meta.resolve('#contracts');
/** URL of the resolved contracts package.json (its directory is the package root). */
export const contractsPackageUrl = import.meta.resolve('#contracts/package.json');
/** URL of a public contracts fixture by name, e.g. 'main' or 'region'. */
export const contractsFixtureUrl = name => import.meta.resolve(`#contracts/fixtures/${name}`);
/** npm caret semantics (0.x: the minor is the compatibility line). A prerelease version satisfies only when the
 * range itself names a prerelease of the same major.minor.patch (npm's includePrerelease=false rule). */
export function satisfiesCaret(version, range) {
  const parse = s => { const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(s);
    return m && { t: m.slice(1, 4).map(Number), pre: m[4] ? m[4].split('.') : [] }; };
  const v = parse(version), r = range.startsWith('^') ? parse(range.slice(1)) : null;
  if (!v || !r) return false;
  const [a, b] = [v.t, r.t];
  if (v.pre.length && (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2] || !r.pre.length)) return false;
  const prePart = (x, y) => { const n = /^\d+$/; const xn = n.test(x), yn = n.test(y);
    return xn && yn ? Number(x) - Number(y) : xn ? -1 : yn ? 1 : x < y ? -1 : x > y ? 1 : 0; };
  const preCmp = (x, y) => { if (!x.length || !y.length) return y.length - x.length;
    for (let i = 0; i < Math.min(x.length, y.length); i++) { const c = prePart(x[i], y[i]); if (c) return c; }
    return x.length - y.length; };
  const cmp = (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]) || preCmp(v.pre, r.pre);
  return cmp >= 0 && a[0] === b[0] && (b[0] > 0 || a[1] === b[1]) && (b[0] > 0 || b[1] > 0 || a[2] === b[2]);
}
