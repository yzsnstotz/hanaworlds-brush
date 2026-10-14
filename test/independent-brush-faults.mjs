// Post-review only. Runs against a normally installed package in a fresh process.
// Usage: node test/independent-brush-faults.mjs CONSUMER_ROOT C_BRUSH_SNAPSHOT
// Test observers never edit the artifact or replace its actual validators.
import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire, registerHooks, syncBuiltinESMExports } from 'node:module';

assert.ok(process.argv[2] && process.argv[3], 'consumer root and full C-brush snapshot required');
const consumer = realpathSync(resolve(process.argv[2]));
const document = readFileSync(process.argv[3], 'utf8');
function block(name) {
  const marker = '```json ' + name + '\n';
  const start = document.indexOf(marker);
  assert.notEqual(start, -1, 'missing document block ' + name);
  assert.equal(document.indexOf(marker, start + marker.length), -1, 'duplicate document block ' + name);
  const end = document.indexOf('\n```', start + marker.length);
  assert.notEqual(end, -1, 'unterminated document block ' + name);
  return JSON.parse(document.slice(start + marker.length, end));
}
const cases = block('c-brush-exception-cases');
const operations = ['BuildDocument', 'CompileRegionBuild'].map(name => {
  const sample = block('c-brush-' + name);
  const success = sample.cases.find(item => item.expected?.result !== null && item.expected?.error === null);
  assert.ok(success, name + ' complete success sample required');
  return { name, sample, success, admission: name === 'BuildDocument' ? 'validateBoundRequest' : 'validateCompileRegionBuildRequest' };
});
assert.deepEqual(cases.identityFields, ['reference', 'constructor', 'name', 'message', 'stack', 'cause']);
const require = createRequire(join(consumer, 'package.json'));
const packagePath = realpathSync(require.resolve('hanaworlds-brush/package.json'));
assert.ok(packagePath.startsWith(realpathSync(join(consumer, 'node_modules')) + '/'), 'package escapes installed consumer');
const packageRoot = dirname(packagePath);
const contractsUrl = pathToFileURL(realpathSync(join(packageRoot, 'dist/contracts.mjs'))).href;
const originalUrl = contractsUrl + '?independent-brush-original';
const admitUrl = pathToFileURL(realpathSync(join(packageRoot, 'dist/admit.mjs'))).href;
const originalAdmitUrl = admitUrl + '?independent-brush-original';
const bridge = Symbol.for('independent-brush-test-observer');
const watched = ['decodeRawJSON', 'validateBoundRequest', 'validateCompileRegionBuildRequest', 'validateResponse'];
const records = [];
let current = null;
const snapshot = error => ({ reference: error, constructor: error.constructor, name: error.name,
  message: error.message, stack: error.stack, cause: error.cause });
function sameError(error, original) {
  assert.equal(error, original.reference, 'original exception identity changed');
  for (const key of cases.identityFields.filter(key => key !== 'reference')) assert.equal(error[key], original[key], 'original ' + key + ' changed');
}
globalThis[bridge] = {
  call(name, actual, args) {
    assert.ok(current, 'unexpected validator call outside a case');
    const event = { name, args, result: undefined, error: null, original: null, origin: 'ACTUAL_VALIDATOR' };
    current.events.push(event);
    try { event.result = actual(...args); }
    catch (error) { event.error = error; event.original = snapshot(error); }
    // Revalidation through raw routes needs a post-decode test fault: raw
    // lone-surrogate JSON naturally fails before the value compiler is entered.
    if (name === 'decodeRawJSON' && !event.error && current.postDecodeSurrogate) {
      event.result = { ...event.result, requestId: '\ud800' };
      event.origin = 'TEST_POST_DECODE_FAULT';
    }
    if (current.fault?.boundary === name && (!current.fault.failureOnly || args[2]?.error !== null)) {
      event.error = current.fault.error;
      event.original = current.fault.original;
      event.origin = 'TEST_BOUNDARY_FAULT_AFTER_ACTUAL_CALL';
      current.fault.count++;
    }
    if (event.error) throw event.error;
    return event.result;
  },
};
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    const adjusted = specifier === 'hanaworlds-brush' && context.parentURL === import.meta.url
      ? { ...context, parentURL: pathToFileURL(join(consumer, 'consumer.mjs')).href } : context;
    return nextResolve(specifier, adjusted);
  },
  load(url, context, nextLoad) {
    if (url === admitUrl) {
      return { format: 'module', shortCircuit: true,
        source: `import * as actual from ${JSON.stringify(originalAdmitUrl)};\nexport * from ${JSON.stringify(originalAdmitUrl)};\nexport const requireSupportedProfiles = (...args) => globalThis[Symbol.for('independent-brush-test-observer')].call('requireSupportedProfiles', actual.requireSupportedProfiles, args);` };
    }
    if (url !== contractsUrl) return nextLoad(url, context);
    const source = `import * as actual from ${JSON.stringify(originalUrl)};\nexport * from ${JSON.stringify(originalUrl)};\n`
      + watched.map(name => `export const ${name} = (...args) => globalThis[Symbol.for('independent-brush-test-observer')].call(${JSON.stringify(name)}, actual.${name}, args);`).join('\n');
    return { format: 'module', shortCircuit: true, source };
  },
});
const crypto = require('node:crypto');
const realCreateHash = crypto.createHash;
const brush = await import('hanaworlds-brush');
const provided = [];
brush.apply({ provide(...args) { provided.push(args); } });
assert.equal(provided.length, 1);
assert.equal(provided[0][0], 'hanaworldsBrushV3');
const service = provided[0][1];
const bytes = request => new TextEncoder().encode(JSON.stringify(request));
const isBytes = route => route === 'bytes' || route === 'serviceBytes';
const publicFields = ['code', 'phase', 'retryability', 'mutationState', 'transactionRef', 'causeCode', 'reason'];
const limit = { code: 'LIMIT_EXCEEDED', phase: 'validate', retryability: 'AFTER_NEW_FACTS',
  mutationState: 'NONE', transactionRef: null, causeCode: null, reason: 'LIMIT_EXCEEDED' };
function completeError(actual, expected) {
  assert.deepEqual(Object.keys(actual).sort(), [...publicFields].sort());
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);
}
function invoke(operation, route, input) {
  const target = route.startsWith('service') ? service : brush;
  return target[operation.sample.binding[route]](input);
}
function run(operation, route, label, input, options = {}) {
  current = { operation: operation.name, route, label, events: [], ...options };
  let result, error;
  try { result = invoke(operation, route, input); } catch (caught) { error = caught; }
  const record = current;
  current = null;
  return { ...record, result, error };
}
function noOutput(record) {
  if (record.error) assert.equal(record.result, undefined);
  else {
    assert.equal(record.result.result, null);
    assert.ok(record.result.error);
    assert.equal(record.result.result?.effects, undefined);
    assert.equal(record.result.result?.chunks, undefined);
  }
  assert.ok(!record.events.some(event => event.name === 'validateResponse' && event.result?.result !== null && event.result?.result !== undefined), 'successful output produced during rejection');
}
function boundaryOnce(record, name) {
  assert.equal(record.events.filter(event => event.name === name).length, 1, name + ' retried or never called');
}
function save(record, origin) {
  records.push({ operation: record.operation, route: record.route, case: record.label,
    outcome: record.error ? 'THROW' : 'ZERO_OUTPUT_ENVELOPE', origin,
    boundaries: record.events.map(event => ({ name: event.name, origin: event.origin, threw: Boolean(event.error) })), retryCount: 0 });
}
function makeFault(name, message) {
  const constructors = { Error, TypeError, RangeError };
  assert.ok(constructors[name], 'unsupported document fault class ' + name);
  const error = new constructors[name](message, { cause: Object.freeze({ source: 'document-test-fault' }) });
  return { error, original: snapshot(error), count: 0 };
}
try {
  for (const operation of operations) for (const route of ['value', 'bytes', 'service', 'serviceBytes']) {
    const request = structuredClone(operation.success.request);
    const input = isBytes(route) ? bytes(request) : request;
    const baseline = run(operation, route, 'complete-success-baseline', input);
    if (baseline.error) throw baseline.error;
    assert.deepEqual(JSON.parse(JSON.stringify(baseline.result)), operation.success.expected);
    assert.ok(baseline.events.some(event => event.name === operation.admission), 'actual admission observer not reached');

    const missing = structuredClone(request); delete missing.requestId;
    const absent = run(operation, route, 'natural-no-requestId', isBytes(route) ? bytes(missing) : missing);
    noOutput(absent); boundaryOnce(absent, operation.admission);
    const admission = absent.events.find(event => event.name === operation.admission);
    assert.ok(admission.error); sameError(absent.error, admission.original); save(absent, 'ACTUAL_VALIDATOR');

    const unsupported = structuredClone(missing);
    if (operation.name === 'BuildDocument') unsupported.build.geometryProfile = 'unsupported-document-profile/v1';
    else unsupported.build.block.geometryProfile = 'unsupported-document-profile/v1';
    const profile = run(operation, route, 'natural-no-ID-profile-gap', isBytes(route) ? bytes(unsupported) : unsupported);
    noOutput(profile); boundaryOnce(profile, 'requireSupportedProfiles');
    const rejectedProfile = profile.events.find(event => event.name === 'requireSupportedProfiles');
    assert.equal(profile.error.code, 'CAPABILITY_GAP');sameError(profile.error, rejectedProfile.original);save(profile, 'ACTUAL_PROFILE_BOUNDARY');

    const surrogate = structuredClone(request); surrogate.requestId = '\ud800';
    const lone = run(operation, route, 'natural-lone-surrogate', isBytes(route) ? bytes(surrogate) : surrogate);
    noOutput(lone);
    const boundary = isBytes(route) ? 'decodeRawJSON' : 'validateResponse';
    boundaryOnce(lone, boundary);
    const original = lone.events.find(event => event.name === boundary);
    assert.ok(original.error); sameError(lone.error, original.original); save(lone, 'ACTUAL_VALIDATOR');

    // Observe a real typed admission failure being serialized; never require
    // the response snapshot to preserve publicError object reference identity.
    const bad = structuredClone(request); bad.buildDigest = '0'.repeat(64);
    const envelope = run(operation, route, 'complete-seven-field-value-envelope', isBytes(route) ? bytes(bad) : bad);
    noOutput(envelope); assert.equal(envelope.error, undefined);
    const rejected = envelope.events.find(event => event.name === operation.admission && event.error);
    assert.ok(rejected); completeError(envelope.result.error, rejected.error.publicError); save(envelope, 'ACTUAL_VALIDATOR');

    const ordinary = cases.ordinary.filter(item => !item.operation || item.operation === operation.name);
    const capacity = cases.capacity.filter(item => item.operations.includes(operation.name));
    for (const descriptor of [...ordinary, ...capacity.map(item => ({ ...item, name: 'RangeError', capacity: true }))]) {
      // Actual admission executes and throws first. Injection then exercises
      // the real compiler catch with no requestId and a single boundary call.
      const fault = { ...makeFault(descriptor.name, descriptor.message), boundary: operation.admission };
      const injected = run(operation, route, 'admission-' + descriptor.name + '-' + descriptor.message,
        isBytes(route) ? bytes(missing) : structuredClone(missing), { fault });
      noOutput(injected); boundaryOnce(injected, operation.admission); assert.equal(fault.count, 1);
      if (descriptor.capacity) {
        assert.ok(injected.error); completeError(injected.error.publicError, limit);
      } else sameError(injected.error, fault.original);
      save(injected, 'TEST_BOUNDARY_FAULT_AFTER_ACTUAL_CALL');

      const responseFault = { ...makeFault(descriptor.name, descriptor.message), boundary: 'validateResponse', failureOnly: true };
      const revalidation = run(operation, route, 'failure-response-' + descriptor.name + '-' + descriptor.message,
        isBytes(route) ? bytes(request) : structuredClone(surrogate),
        { fault: responseFault, postDecodeSurrogate: isBytes(route) });
      noOutput(revalidation); boundaryOnce(revalidation, 'validateResponse'); assert.equal(responseFault.count, 1);
      sameError(revalidation.error, responseFault.original);
      save(revalidation, isBytes(route) ? 'TEST_POST_DECODE_AND_RESPONSE_FAULT' : 'TEST_RESPONSE_FAULT_AFTER_ACTUAL_VALIDATOR');

      const hashFault = makeFault(descriptor.name, descriptor.message);
      crypto.createHash = () => { hashFault.count++; throw hashFault.error; };
      syncBuiltinESMExports();
      let hashing;
      try { hashing = run(operation, route, 'crypto-' + descriptor.name + '-' + descriptor.message, isBytes(route) ? bytes(request) : structuredClone(request)); }
      finally { crypto.createHash = realCreateHash; syncBuiltinESMExports(); }
      noOutput(hashing); assert.equal(hashFault.count, 1, 'createHash retry');
      if (descriptor.capacity) { assert.equal(hashing.error, undefined); completeError(hashing.result.error, limit); }
      else sameError(hashing.error, hashFault.original);
      save(hashing, 'ISOLATED_CONSUMER_NODE_CRYPTO_CREATEHASH_FAULT');
    }
    if (isBytes(route)) {
      const malformed = run(operation, route, 'natural-raw-malformed', new TextEncoder().encode('{"requestId":"raw-id",'));
      noOutput(malformed); boundaryOnce(malformed, 'decodeRawJSON');
      assert.equal(malformed.events.length, 1, 'raw error entered value compiler');
      sameError(malformed.error, malformed.events[0].original); save(malformed, 'ACTUAL_VALIDATOR');
      for (const descriptor of [...ordinary, ...capacity.map(item => ({ ...item, name: 'RangeError' }))]) {
        const fault = { ...makeFault(descriptor.name, descriptor.message), boundary: 'decodeRawJSON' };
        const raw = run(operation, route, 'raw-boundary-' + descriptor.message, bytes(request), { fault });
        noOutput(raw); boundaryOnce(raw, 'decodeRawJSON'); assert.equal(raw.events.length, 1); assert.equal(fault.count, 1);
        sameError(raw.error, fault.original); save(raw, 'TEST_RAW_FAULT_AFTER_ACTUAL_DECODE');
      }
      const revalidation = run(operation, route, 'raw-route-actual-response-revalidation', bytes(request), { postDecodeSurrogate: true });
      noOutput(revalidation); boundaryOnce(revalidation, 'validateResponse');
      const original = revalidation.events.find(event => event.name === 'validateResponse');
      assert.ok(original.error); sameError(revalidation.error, original.original); save(revalidation, 'TEST_POST_DECODE_FAULT_ACTUAL_RESPONSE_VALIDATOR');
    }
  }
  console.log(JSON.stringify({ evidence: 'REAL_INSTALLED_BRUSH_EXCEPTION_BOUNDARIES', packageRoot,
    observer: 'node:module.registerHooks; actual validators called before test faults', cases: records.length, records,
    externalHostAcceptance: 'NOT_RUN', productAcceptance: 'NOT_RUN' }));
} finally {
  crypto.createHash = realCreateHash;
  syncBuiltinESMExports();
  hook.deregister();
  delete globalThis[bridge];
}
