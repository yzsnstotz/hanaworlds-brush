// The one place that names the hanaworlds-contracts dependency this Brush admits.
// package.json "imports" map #contracts to the installed hanaworlds-contracts dependency, declared as the
// contracts source git `#semver:` range below; ADMITTED_CONTRACTS is that range, not a commit or byte pin.
// Tests, preview and tools/verify-contracts-artifact.mjs locate contracts only through here,
// so raising the floor is: this range + the package.json dependency, then `npm install`.
export const ADMITTED_CONTRACTS = Object.freeze({
  name: 'hanaworlds-contracts', range: '^0.5.6',
  source: 'https://github.com/yzsnstotz/hanaworlds-contracts',
});
/** URL of the contracts entry module Brush itself imports as #contracts. */
export const contractsUrl = import.meta.resolve('#contracts');
/** URL of the resolved contracts package.json (its directory is the package root). */
export const contractsPackageUrl = import.meta.resolve('#contracts/package.json');
/** URL of a public contracts fixture by name, e.g. 'main' or 'region'. */
export const contractsFixtureUrl = name => import.meta.resolve(`#contracts/fixtures/${name}`);
/** npm caret semantics for a release version (0.x: the minor is the compatibility line); prereleases never satisfy. */
export function satisfiesCaret(version, range) {
  const v = /^(\d+)\.(\d+)\.(\d+)$/.exec(version), r = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(range);
  if (!v || !r) return false;
  const [a, b] = [v, r].map(m => m.slice(1).map(Number));
  const cmp = (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]);
  return cmp >= 0 && a[0] === b[0] && (b[0] > 0 || a[1] === b[1]) && (b[0] > 0 || b[1] > 0 || a[2] === b[2]);
}
