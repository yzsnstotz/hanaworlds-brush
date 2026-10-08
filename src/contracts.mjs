// The one place that names the hanaworlds-contracts package this Brush is pinned to.
// package.json "imports" map #contracts to the installed hanaworlds-contracts dependency; ADMITTED_CONTRACTS is the exact package identity that resolution must yield.
// Tests, preview and tools/verify-contracts-artifact.mjs locate contracts only through here,
// so a re-pin is: tools/switch-contracts.mjs (imports + dependency + this identity).
export const ADMITTED_CONTRACTS = Object.freeze({
  name: 'hanaworlds-contracts', version: '0.5.4',
  source: 'https://github.com/yzsnstotz/hanaworlds-contracts',
  revision: '85687fc3811e4c8ee6e69410d46d8026e19d2c75',
  sha256: 'b920097dee8bf57ef44cc9ca964829e568b14c9e1b15a77bf4599f69391062ec',
  entries: 26,
});
/** URL of the contracts entry module Brush itself imports as #contracts. */
export const contractsUrl = import.meta.resolve('#contracts');
/** URL of the resolved contracts package.json (its directory is the package root). */
export const contractsPackageUrl = import.meta.resolve('#contracts/package.json');
/** URL of a public contracts fixture by name, e.g. 'main' or 'region'. */
export const contractsFixtureUrl = name => import.meta.resolve(`#contracts/fixtures/${name}`);
