// The one place that names the hanaworlds-contracts package this Brush is pinned to.
// package.json "imports" map #contracts to the installed hanaworlds-contracts dependency; ADMITTED_CONTRACTS is the exact package identity that resolution must yield.
// Tests, preview and tools/verify-contracts-artifact.mjs locate contracts only through here,
// so a re-pin is: tools/switch-contracts.mjs (imports + dependency + this identity).
export const ADMITTED_CONTRACTS = Object.freeze({
  name: 'hanaworlds-contracts', version: '0.5.3',
  source: 'https://github.com/yzsnstotz/hanaworlds-contracts',
  revision: '3457493da209178f815d6950e323e1dc462e8d6c',
  sha256: '7f2b088b300426ea2536e08904780dc5df94eaf5e341e83cbff0cc3a42362241',
  entries: 25,
});
/** URL of the contracts entry module Brush itself imports as #contracts. */
export const contractsUrl = import.meta.resolve('#contracts');
/** URL of the resolved contracts package.json (its directory is the package root). */
export const contractsPackageUrl = import.meta.resolve('#contracts/package.json');
/** URL of a public contracts fixture by name, e.g. 'main' or 'region'. */
export const contractsFixtureUrl = name => import.meta.resolve(`#contracts/fixtures/${name}`);
