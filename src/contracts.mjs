// The one place that names the hanaworlds-contracts release this Brush admits.
// package.json "imports" map #contracts to the installed hanaworlds-contracts dependency,
// declared as `dependency` below: the contracts release tag in the published form
// `git+<repo>.git#v<version>` (no `#semver:` range, no commit pin; the lock records the
// commit the tag resolved to). Tests and tools/verify-contracts-artifact.mjs locate
// contracts only through here, so moving to another release is: `version` below + the
// package.json dependency, then `npm install`.
const version = '2.2.1';
const repo = 'https://github.com/yzsnstotz/hanaworlds-contracts';
export const ADMITTED_CONTRACTS = Object.freeze({
  name: 'hanaworlds-contracts', version, source: repo,
  dependency: `git+${repo}.git#v${version}`,
});
/** URL of the contracts entry module Brush itself imports as #contracts. */
export const contractsUrl = import.meta.resolve('#contracts');
/** URL of the resolved contracts package.json (its directory is the package root). */
export const contractsPackageUrl = import.meta.resolve('#contracts/package.json');
/** URL of a public contracts fixture by name, e.g. 'main' or 'region'. */
export const contractsFixtureUrl = name => import.meta.resolve(`#contracts/fixtures/${name}`);
