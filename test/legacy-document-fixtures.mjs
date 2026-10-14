// Shared test inputs are the complete C-brush document's own success samples.
// Geometry regressions derive explicitly named test cases from those samples.
import { readDocument } from './independent-brush-support.mjs';
export const document = readDocument();
export const metadata = document.get('package-metadata');
export const buildSample = document.get('BuildDocument').cases.find(c => c.id === 'BuildDocument-success');
export const regionSample = document.get('CompileRegionBuild').cases.find(c => c.id === 'CompileRegionBuild-success');
export const buildRequest = () => structuredClone(buildSample.request);
export const regionRequest = () => structuredClone(regionSample.request);

// Compatibility checks are test-owned interpretation of documented metadata,
// not additional operations in the Brush runtime ABI.
const compatibilityError = code => { const error=new Error(code);error.code=code;throw error; };
export function checkContractHandshake(value) {
 const major=v=>Number(/@(\d+)\./.exec(v)?.[1]);
 if(major(value.contracts)!==major(metadata.legacyContractHandshake.contracts))compatibilityError('UNSUPPORTED_VERSION');
 return {result:'HANDSHAKE_VERSION_MATCH'};
}
export function protocolRequirement(wire,capabilities=[],minMinor=0) {
 const match=/^(.+)\/[Vv](\d+)$/.exec(wire);
 if(!match)compatibilityError('UNSUPPORTED_VERSION');
 return {protocol:match[1],major:Number(match[2]),minMinor,capabilities};
}
export function checkProtocolCompatibility(value,requirements) {
 if(!Array.isArray(value.protocols)||!Array.isArray(value.capabilities))compatibilityError('UNSUPPORTED_VERSION');
 for(const requirement of requirements) {
  const actual=value.protocols.find(p=>p.protocol===requirement.protocol);
  if(!actual||actual.major!==requirement.major||actual.minor<requirement.minMinor)compatibilityError('UNSUPPORTED_VERSION');
  if(requirement.capabilities.some(c=>!value.capabilities.includes(c)))compatibilityError('CAPABILITY_UNAVAILABLE');
 }
 return {result:'PROTOCOL_COMPATIBLE'};
}
