#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "$0")/.." && pwd)
sha=${1:?exact source commit required}
evidence=${2:?absolute evidence directory required}
case "$evidence" in /*) ;; *) echo 'Evidence path must be absolute' >&2; exit 2;; esac
node_bin=${BRUSH_NODE_BIN:-/Users/yzliu/.local/share/fnm/node-versions/v24.13.1/installation/bin}
export PATH="$node_bin:$PATH"
[ "$(node --version)" = v24.13.1 ]
[ "$(npm --version)" = 11.8.0 ]
mkdir -p "$evidence"
if [ -n "$(ls -A "$evidence")" ]; then echo 'Use a new evidence directory; preserve previous evidence' >&2; exit 2; fi
run=$(dirname "$repo")
work=$(mktemp -d "$run/.gate.XXXXXX")
trap 'rm -rf "$work"' EXIT
export NPM_CONFIG_CACHE="$work/npm-cache"
export npm_config_cache="$NPM_CONFIG_CACHE"
export npm_config_update_notifier=false
export BRUSH_VERIFY_TMP="$work"
git -C "$repo" rev-parse "$sha^{commit}" > "$evidence/source-sha.txt"
{ command -v node; node --version; command -v npm; npm --version; } > "$evidence/runtime.txt"
mkdir "$work/source"
git -C "$repo" archive "$sha" | tar -xf - -C "$work/source"
cd "$work/source"
npm ci --ignore-scripts --no-audit --no-fund > "$evidence/npm-ci.log" 2>&1
npm run build > "$evidence/build.log" 2>&1
# Source checks need repository metadata only for the immutable baseline comparison.
(cd "$repo" && node "$work/source/tools/verify-image-source.mjs") > "$evidence/source-verification.log" 2>&1
npm run test:image > "$evidence/source-tests.log" 2>&1
npm run typecheck > "$evidence/source-types.log" 2>&1
npm run verify:contracts > "$evidence/contracts-artifact.log" 2>&1
npm pack --ignore-scripts --pack-destination "$evidence" --json > "$evidence/pack.json"
tarname=$(node --input-type=module -e 'import fs from "node:fs";console.log(JSON.parse(fs.readFileSync(process.argv[1]))[0].filename)' "$evidence/pack.json")
shasum -a 256 "$evidence/$tarname" > "$evidence/tar.sha256"
mkdir "$work/consumer"
cd "$work/consumer"
printf '%s\n' '{"name":"brush-independent-consumer","private":true,"type":"module"}' > package.json
npm install --ignore-scripts --no-audit --no-fund "$evidence/$tarname" > "$evidence/consumer-install.log" 2>&1
cp "$work/source/test/image-contracts.test.mjs" "$work/source/test/consumer.mts" .
BRUSH_UNDER_TEST=hanaworlds-brush node --test image-contracts.test.mjs > "$evidence/consumer-tests.log" 2>&1
"$work/source/node_modules/.bin/tsc" --noEmit --strict --module nodenext --moduleResolution nodenext --target es2022 consumer.mts > "$evidence/consumer-types.log" 2>&1
node "$work/source/tools/verify-contracts-artifact.mjs" "$work/consumer/node_modules/hanaworlds-brush" > "$evidence/consumer-contracts.log" 2>&1
node --input-type=module -e 'import {BrushV3,version} from "hanaworlds-brush"; console.log(JSON.stringify({resolved:import.meta.resolve("hanaworlds-brush"),version,status:new BrushV3().status(),evidence:"SOURCE/FIXTURE",worldWrites:0}))' > "$evidence/consumer-identity.json"
cat "$evidence/source-tests.log" "$evidence/consumer-tests.log" "$evidence/tar.sha256"
echo 'SOURCE/FIXTURE gate completed; App/model/world/Undo NOT_RUN; temporary archive, consumer and caches removed on exit.'
