// Pre-admission reads shared by the BUILD and region compilers. Both read only
// own data properties of plain objects, so a rejected input never runs caller
// code (no getters, no proxy traps).

import { types as nodeTypes } from 'node:util';
import { ContractError } from '#contracts';

/**
 * Geometry profiles this compiler can expand. A payload naming any other
 * profile is a capability gap of Brush (CAPABILITY_GAP /
 * GEOMETRY_PROFILE_UNSUPPORTED), not a malformed request: the profile decides
 * how the rest of the payload is read, so it is checked before the schema.
 */
export const geometryProfiles = Object.freeze(['voxel-grid/v1']);

function own(value, key) {
  if (value === null || typeof value !== 'object' || nodeTypes.isProxy(value) || Array.isArray(value)) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
}

/** requestId of a raw request when it is a plain non-empty string, else null. */
export function requestIdOf(value) {
  const id = own(value, 'requestId');
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * Throw CAPABILITY_GAP when the request is on `wire` and a geometryProfile at
 * one of `paths` is a string Brush does not support. Anything else (absent,
 * not a string, another wire) is left to the strict schema.
 */
export function requireSupportedProfiles(value, wire, paths) {
  if (own(value, 'contractVersion') !== wire) return;
  for (const path of paths) {
    const profile = path.reduce(own, value);
    if (typeof profile === 'string' && !geometryProfiles.includes(profile)) {
      throw new ContractError('CAPABILITY_GAP', 'validate', 'GEOMETRY_PROFILE_UNSUPPORTED');
    }
  }
}
