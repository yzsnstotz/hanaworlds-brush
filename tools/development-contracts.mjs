// Development-only names for the self-owned document closure; never packed.
export const OWN_CONTRACTS = Object.freeze({
  contract: 'C-brush/v3',
  schema: 'src/contract-schema.json',
  metadata: 'src/contract-metadata.json',
  types: 'types/contracts.d.mts',
  typesSha256: '69375f6ed752934dc3fb7a98f7b14e3c39432f69838203748244e1c3e24b70a9',
  metadataContentSha256: 'cc1cb85356fdb333377ede9b5985fbf517b261db652734d3b94a814bf6a28eb8',
  schemaContentSha256: '23d33514df1eddc61a95fabdee0dc26a8e252ef60d0378c1749bedf01522ce5c',
});
/** URL of Brush's own internal validation module, for retained local regressions. */
export const contractsUrl = new URL('../src/contracts.mjs', import.meta.url).href;

export const OWN_SOURCE_FILES = Object.freeze([
  "src/admit.mjs",
  "src/compile.mjs",
  "src/contract-metadata.json",
  "src/contract-schema.json",
  "src/contracts.mjs",
  "src/expand.mjs",
  "src/index.mjs",
  "src/region.mjs",
  "src/shapes/README.md",
  "src/shapes/index.mjs",
  "src/shapes/upstream/.gitattributes",
  "src/shapes/upstream/LICENSE.AGPLv3.txt",
  "src/shapes/upstream/LICENSE.txt",
  "src/shapes/upstream/common.lua",
  "src/shapes/upstream/primitives.lua",
  "src/shapes/upstream/source.json",
  "src/validation.mjs"
]);
