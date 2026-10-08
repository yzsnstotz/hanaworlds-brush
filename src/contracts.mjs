// The one place that names the hanaworlds-contracts package this Brush is pinned to.
// package.json "imports" decides where #contracts resolves (vendored copy or an installed
// package); ADMITTED_CONTRACTS is the exact package identity that resolution must yield.
// Tests, preview and tools/verify-contracts-artifact.mjs locate contracts only through here,
// so a re-pin is: tools/switch-contracts.mjs (imports + dependency + this identity).
export const ADMITTED_CONTRACTS = Object.freeze({
  name: 'hanaworlds-contracts', version: '0.5.0',
  source: 'https://github.com/yzsnstotz/hanaworlds-contracts',
  revision: 'c006a839a6e6c2c63d57a14b72e4e6b26fa717f1',
  sha256: '7fb42f1eaaf4988730f6cf254faecb84bbbb1d84e293558b66727c470181b31e',
  entries: 24,
});
/** URL of the contracts entry module Brush itself imports as #contracts. */
export const contractsUrl = import.meta.resolve('#contracts');
/** URL of the resolved contracts package.json (its directory is the package root). */
export const contractsPackageUrl = import.meta.resolve('#contracts/package.json');
/** URL of a public contracts fixture by name, e.g. 'main' or 'region'. */
export const contractsFixtureUrl = name => import.meta.resolve(`#contracts/fixtures/${name}`);
