// Development-only SDK identity and fixture resolution; never packed.
const version = '2.2.1';
const repo = 'https://github.com/yzsnstotz/hanaworlds-contracts';
export const ADMITTED_CONTRACTS = Object.freeze({
  name: 'hanaworlds-contracts', version, source: repo,
  dependency: `git+${repo}.git#v${version}`,
});
/** URL of the development contracts public entry module. */
export const contractsUrl = import.meta.resolve('hanaworlds-contracts');
/** URL of the resolved contracts package.json (its directory is the package root). */
export const contractsPackageUrl = import.meta.resolve('hanaworlds-contracts/package.json');
/** URL of a public contracts fixture by name, e.g. 'main' or 'region'. */
export const contractsFixtureUrl = name => import.meta.resolve(`hanaworlds-contracts/fixtures/${name}`);
