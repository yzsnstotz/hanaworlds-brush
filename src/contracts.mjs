// The one place that names the hanaworlds-contracts package this Brush is pinned to.
// package.json "imports" map #contracts to the installed hanaworlds-contracts dependency; ADMITTED_CONTRACTS is the exact package identity that resolution must yield.
// Tests, preview and tools/verify-contracts-artifact.mjs locate contracts only through here,
// so a re-pin is: tools/switch-contracts.mjs (imports + dependency + this identity).
export const ADMITTED_CONTRACTS = Object.freeze({
  name: 'hanaworlds-contracts', version: '0.5.4-rc.1',
  source: 'https://github.com/yzsnstotz/hanaworlds-contracts',
  revision: '0beeff5774db476c0128683ca6107a28bdcdcbee',
  sha256: '51902797a167a222d812c344871bb1c0774ae775fb0026d70381edd4c08f17ed',
  entries: 26,
});
/** URL of the contracts entry module Brush itself imports as #contracts. */
export const contractsUrl = import.meta.resolve('#contracts');
/** URL of the resolved contracts package.json (its directory is the package root). */
export const contractsPackageUrl = import.meta.resolve('#contracts/package.json');
/** URL of a public contracts fixture by name, e.g. 'main' or 'region'. */
export const contractsFixtureUrl = name => import.meta.resolve(`#contracts/fixtures/${name}`);
