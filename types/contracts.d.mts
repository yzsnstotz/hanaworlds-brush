/** Self-owned C-brush v3 declarations from its complete contract document. */
// C-brush v3 self-owned document type closure. All wire I/O profiles unchanged.
// SOURCE ordinary upper bounds and defensive combinations are not runtime proof.
// Numeric/string/order/digest/domain refinements remain normative in the full document/schema.
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type Axes = readonly [Axis, Axis, Axis];
export type Axis = "+X" | "+Y" | "+Z" | "-X" | "-Y" | "-Z";
export type BodyWitness = { readonly "evidence": EvidenceBinding; readonly "positions": Positions };
export type Bool = boolean;
export type Box = { readonly "min": Position; readonly "max": Position };
export type BuildDocumentRequest = { readonly "contractVersion": "BUILD/V5"; readonly "sessionRef": Ref; readonly "requestId": Ref; readonly "worldRef": Ref; readonly "build": BuildProjection; readonly "buildDigest": Digest; readonly "catalogue": Catalogue; readonly "catalogueDigest": Digest; readonly "targetFacts": TargetFacts; readonly "targetFactsDigest": Digest; readonly "safetyProfile": SafetyProfile; readonly "safetyProfileDigest": Digest; readonly "compilationConfig": CompilationConfig; readonly "compilationConfigDigest": Digest; readonly "compilerRevision": Revision; readonly "localContext": LocalWorldContext };
export type BuildOps = ReadonlyArray<SetBox>;
export type BuildProjection = { readonly "contractVersion": "BUILD/V5"; readonly "geometryProfile": GeometryProfile; readonly "documentId": Ref; readonly "coordinateFrame": Frame; readonly "catalogueDigest": Digest; readonly "targetFactsDigest": Digest; readonly "safetyProfileDigest": Digest; readonly "materials": MaterialMap; readonly "operations": BuildOps; readonly "declaredBounds": Box; readonly "witnesses": Witnesses };
export type Catalogue = { readonly "profileVersion": "catalogue/v3"; readonly "engineRevisions": EngineRevisions; readonly "emptyMaterialRef": Ref; readonly "materials": MaterialTagMap };
export type ChunkPosition = readonly [SafeInt, SafeInt, SafeInt];
export type ClearanceCells = { readonly "width": PositiveInt; readonly "height": PositiveInt; readonly "depth": PositiveInt; readonly "unit": "node" };
export type CompilationConfig = { readonly "profileVersion": "compilation-config/v3"; readonly "writeBackend": WriteBackendRef; readonly "overlapRule": "last-writer-wins"; readonly "effectOrder": "numeric-x-y-z"; readonly "compressionRule": "exact-final-effects-only" };
export type CompileRegionBuildRequest = { readonly "contractVersion": "region-build/v2"; readonly "sessionRef": Ref; readonly "requestId": Ref; readonly "worldRef": Ref; readonly "build": RegionBuildProjection; readonly "buildDigest": Digest; readonly "catalogue": Catalogue; readonly "catalogueDigest": Digest; readonly "partition": Partition; readonly "compilerRevision": Revision; readonly "localContext": LocalWorldContext };
export type CompiledOperationSet = { readonly "projection": OperationsProjection; readonly "operationDigest": Digest; readonly "readBounds": Box; readonly "writeBounds": Box };
export type CompiledRegionSet = { readonly "projection": RegionOperationsProjection; readonly "operationDigest": Digest; readonly "writeBounds": Box };
export type Coverage = { readonly "profileVersion": "coverage/v2"; readonly "sampledBounds": Box; readonly "sampledPositions": Positions };
export type CoverageWitness = { readonly "evidence": EvidenceBinding; readonly "positions": Positions };
export type Digest = string;
export type Effect = { readonly "geometryProfile": GeometryProfile; readonly "position": Position; readonly "materialRef": Ref; readonly "orientation": Orientation };
export type Effects = ReadonlyArray<Effect>;
export type EngineRevisions = {readonly [key: string]: Revision};
export type EntranceWitness = { readonly "evidence": EvidenceBinding; readonly "portalRef": Ref | null; readonly "usablePositions": Positions; readonly "path": PositionPath; readonly "clearance": ClearanceCells };
export type EvidenceBinding = { readonly "providerRef": Ref; readonly "sourceRevision": Revision; readonly "worldRef": Ref | null; readonly "worldRevision": Revision | null };
export type FactsSource = "INSPECTED" | "PLANNED" | "REGION_INSPECTED";
export type FieldNames = ReadonlyArray<Ref>;
export type FinalEffects = { readonly "profileVersion": "final-effects/v3"; readonly "frameDigest": Digest; readonly "catalogueDigest": Digest; readonly "effects": Effects };
export type Frame = { readonly "profileVersion": "frame/v2"; readonly "frameId": Ref; readonly "origin": Position; readonly "axes": Axes; readonly "handedness": Handedness; readonly "gridUnit": GridUnit; readonly "transformRevision": Revision };
export type GeometryProfile = "voxel-grid/v1";
export type GridUnit = { readonly "name": Ref; readonly "metersPerGridUnit": PositiveFinite | null };
export type Handedness = "left" | "right";
export type HazardPolicy = { readonly "forbidLiquid": Bool; readonly "maximumDamagePerSecond": NonNegativeFinite };
export type HazardWitness = { readonly "evidence": EvidenceBinding; readonly "positions": Positions; readonly "forbidLiquid": Bool; readonly "maximumDamagePerSecond": NonNegativeFinite };
export type LightRule = { readonly "minimumLight": UnitInterval; readonly "sourceRevision": Revision };
export type LocalWorldContext = { readonly "connectionRef": Ref; readonly "connectionIncarnationRef": Ref; readonly "worldRef": Ref; readonly "selectionRevision": Revision };
export type MaterialMap = {readonly [key: string]: MaterialSpec};
export type MaterialSpec = { readonly "materialRef": Ref; readonly "orientation": Orientation };
export type MaterialTagMap = {readonly [key: string]: MaterialTags};
export type MaterialTags = { readonly "passable": Bool | null; readonly "liquid": Bool | null; readonly "hazardPerSecond": NonNegativeFinite | null; readonly "emitsLight": Bool | null; readonly "placeable": Bool | null; readonly "orientations": Orientations | null; readonly "definitionRevision": Revision | null; readonly "unknownFields": FieldNames; readonly "extension": OpaqueMap };
export type NonNegativeFinite = number;
export type NonNegativeInt = number;
export type OccupiedCell = { readonly "position": Position; readonly "materialRef": Ref; readonly "orientation": Orientation };
export type OccupiedCells = ReadonlyArray<OccupiedCell>;
export type OpaqueCode = string;
export type OpaqueMap = {readonly [key: string]: OpaqueValue};
export type OpaqueValue = JsonValue;
export type OperationsProjection = { readonly "contractVersion": "operations/v4"; readonly "buildDigest": Digest; readonly "compilerRevision": Revision; readonly "compilationConfigDigest": Digest; readonly "worldRef": Ref; readonly "frameDigest": Digest; readonly "catalogueDigest": Digest; readonly "targetFactsDigest": Digest; readonly "effects": Effects };
export type Orientation = number;
export type Orientations = ReadonlyArray<Orientation>;
export type Partition = { readonly "edge": RegionSize };
export type Portal = { readonly "portalRef": Ref; readonly "positions": Positions };
export type Portals = ReadonlyArray<Portal>;
export type Position = readonly [SafeInt, SafeInt, SafeInt];
export type PositionPath = ReadonlyArray<Position>;
export type Positions = ReadonlyArray<Position>;
export type PositiveFinite = number;
export type PositiveInt = number;
export type Ref = string;
export type RegionBuildProjection = { readonly "contractVersion": "region-build/v2"; readonly "documentId": Ref; readonly "coordinateSpace": "WORLD_NODE"; readonly "worldRef": Ref; readonly "catalogueDigest": Digest; readonly "block": RegionVoxelBlock; readonly "declaredBounds": Box };
export type RegionChunk = { readonly "chunkPos": ChunkPosition; readonly "block": RegionVoxelBlock; readonly "blockDigest"?: Digest };
export type RegionChunks = ReadonlyArray<RegionChunk>;
export type RegionOperationsProjection = { readonly "contractVersion": "region-operations/v2"; readonly "buildDigest": Digest; readonly "compilerRevision": Revision; readonly "worldRef": Ref; readonly "catalogueDigest": Digest; readonly "partition": Partition; readonly "chunks": RegionChunks };
export type RegionPalette = ReadonlyArray<MaterialSpec>;
export type RegionRun = readonly [PositiveInt, NonNegativeInt | null];
export type RegionRuns = ReadonlyArray<RegionRun>;
export type RegionSize = readonly [PositiveInt, PositiveInt, PositiveInt];
export type RegionVoxelBlock = { readonly "profileVersion": "region-voxels/v2"; readonly "geometryProfile": GeometryProfile; readonly "origin": Position; readonly "size": RegionSize; readonly "indexOrder": "X_FASTEST_THEN_Y_THEN_Z"; readonly "palette": RegionPalette; readonly "runs": RegionRuns };
export type Revision = string;
export type SafeInt = number;
export type SafetyProfile = { readonly "profileVersion": "safety-profile/v5"; readonly "connectivity": 6; readonly "requireBodyClearance": Bool; readonly "requireEntranceConnectivity": Bool; readonly "hazardPolicy": HazardPolicy; readonly "optionalLightRule": LightRule | null };
export type SetBox = { readonly "op": "set_box"; readonly "min": Position; readonly "max": Position; readonly "materialRef": Ref };
export type TargetFacts = { readonly "profileVersion": "target-facts/v5"; readonly "geometryProfile": GeometryProfile; readonly "source": FactsSource; readonly "worldRef": Ref | null; readonly "objectRef": Ref | null; readonly "worldRevision": Revision | null; readonly "objectRevision": Revision | null; readonly "buildDigest": Digest | null; readonly "planRevision": Revision | null; readonly "catalogueDigest": Digest; readonly "frameDigest": Digest; readonly "sampledBounds": Box; readonly "coverageDigest": Digest; readonly "occupiedCells": OccupiedCells; readonly "knownEmptyCells": Positions; readonly "unknownCells": UnknownCells; readonly "portals": Portals; readonly "usableVolume": UsableVolume | null };
export type UnitInterval = number;
export type UnknownCell = { readonly "position": Position; readonly "reason": OpaqueCode };
export type UnknownCells = ReadonlyArray<UnknownCell>;
export type UsableVolume = { readonly "emptyCellCount": NonNegativeInt; readonly "physicalVolume": NonNegativeFinite | null; readonly "standingArea": NonNegativeFinite | null; readonly "unit": Ref };
export type Witness = { readonly "witnessId": Ref; readonly "predicate": "COVERAGE"; readonly "finalEffectsDigest": Digest; readonly "targetFactsDigest": Digest; readonly "safetyProfileDigest": Digest; readonly "facts": CoverageWitness } | { readonly "witnessId": Ref; readonly "predicate": "BODY_CLEARANCE"; readonly "finalEffectsDigest": Digest; readonly "targetFactsDigest": Digest; readonly "safetyProfileDigest": Digest; readonly "facts": BodyWitness } | { readonly "witnessId": Ref; readonly "predicate": "ENTRANCE_CONNECTIVITY"; readonly "finalEffectsDigest": Digest; readonly "targetFactsDigest": Digest; readonly "safetyProfileDigest": Digest; readonly "facts": EntranceWitness } | { readonly "witnessId": Ref; readonly "predicate": "HAZARD"; readonly "finalEffectsDigest": Digest; readonly "targetFactsDigest": Digest; readonly "safetyProfileDigest": Digest; readonly "facts": HazardWitness };
export type Witnesses = ReadonlyArray<Witness>;
export type WriteBackendRef = { readonly "profileId": Ref; readonly "revision": Revision };
export type ErrorReason = "INVALID_UTF8" | "DUPLICATE_DECODED_KEY" | "LONE_SURROGATE" | "INVALID_NUMBER" | "INVALID_SHAPE" | "UNKNOWN_FIELD" | "VERSION_UNSUPPORTED" | "PAYLOAD_CHANGED" | "REVISION_CHANGED" | "INVALID_GEOMETRY" | "CATALOGUE_UNRESOLVED" | "REQUIRED_FACT_UNKNOWN" | "POLICY_UNAVAILABLE" | "LIMIT_EXCEEDED" | "SCOPE_DENIED" | "GEOMETRY_PROFILE_UNSUPPORTED";
export type Phase = "decode" | "validate";
export type Retryability = "NEVER" | "AFTER_NEW_FACTS";
export type MutationState = "NONE";

// Seven-field correlated error unions. Do not reconstruct these from independent enums.
export type BuildOrdinaryError =
    { readonly code: "SCHEMA_INVALID"; readonly phase: "decode"; readonly retryability: "NEVER"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "INVALID_SHAPE" }
  | { readonly code: "SCHEMA_INVALID"; readonly phase: "decode"; readonly retryability: "NEVER"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "INVALID_UTF8" }
  | { readonly code: "SCHEMA_INVALID"; readonly phase: "decode"; readonly retryability: "NEVER"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "INVALID_NUMBER" }
  | { readonly code: "SCHEMA_INVALID"; readonly phase: "decode"; readonly retryability: "NEVER"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "LONE_SURROGATE" }
  | { readonly code: "SCHEMA_INVALID"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "INVALID_SHAPE" }
  | { readonly code: "SCHEMA_INVALID"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "INVALID_GEOMETRY" }
  | { readonly code: "NON_CANONICAL_AMBIGUITY"; readonly phase: "decode"; readonly retryability: "NEVER"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "DUPLICATE_DECODED_KEY" }
  | { readonly code: "NON_CANONICAL_AMBIGUITY"; readonly phase: "validate"; readonly retryability: "NEVER"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "PAYLOAD_CHANGED" }
  | { readonly code: "CAPABILITY_GAP"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "GEOMETRY_PROFILE_UNSUPPORTED" }
  | { readonly code: "UNSUPPORTED_VERSION"; readonly phase: "decode"; readonly retryability: "NEVER"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "VERSION_UNSUPPORTED" }
  | { readonly code: "UNKNOWN_REQUIRED_FIELD"; readonly phase: "decode"; readonly retryability: "NEVER"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "UNKNOWN_FIELD" }
  | { readonly code: "CURRENT_WORLD_MISMATCH"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "REVISION_CHANGED" }
  | { readonly code: "TRANSACTION_CONFLICT"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "PAYLOAD_CHANGED" }
  | { readonly code: "CATALOGUE_MISMATCH"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "CATALOGUE_UNRESOLVED" }
  | { readonly code: "UNSUPPORTED_MUTATION_SEMANTICS"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "REQUIRED_FACT_UNKNOWN" }
  | { readonly code: "LIMIT_EXCEEDED"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "LIMIT_EXCEEDED" }
  | { readonly code: "TARGET_FACTS_INCOMPLETE"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "REQUIRED_FACT_UNKNOWN" }
  | { readonly code: "CAPABILITY_UNAVAILABLE"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "POLICY_UNAVAILABLE" }
  | { readonly code: "CAPABILITY_UNAVAILABLE"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "REQUIRED_FACT_UNKNOWN" }
  | { readonly code: "SAFETY_INVARIANT_FAILED"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "REQUIRED_FACT_UNKNOWN" };
export type CompileRegionOrdinaryError =
    { readonly code: "SCHEMA_INVALID"; readonly phase: "decode"; readonly retryability: "NEVER"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "INVALID_SHAPE" }
  | { readonly code: "SCHEMA_INVALID"; readonly phase: "decode"; readonly retryability: "NEVER"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "INVALID_UTF8" }
  | { readonly code: "SCHEMA_INVALID"; readonly phase: "decode"; readonly retryability: "NEVER"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "INVALID_NUMBER" }
  | { readonly code: "SCHEMA_INVALID"; readonly phase: "decode"; readonly retryability: "NEVER"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "LONE_SURROGATE" }
  | { readonly code: "SCHEMA_INVALID"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "INVALID_SHAPE" }
  | { readonly code: "SCHEMA_INVALID"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "INVALID_GEOMETRY" }
  | { readonly code: "NON_CANONICAL_AMBIGUITY"; readonly phase: "decode"; readonly retryability: "NEVER"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "DUPLICATE_DECODED_KEY" }
  | { readonly code: "NON_CANONICAL_AMBIGUITY"; readonly phase: "validate"; readonly retryability: "NEVER"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "PAYLOAD_CHANGED" }
  | { readonly code: "CAPABILITY_GAP"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "GEOMETRY_PROFILE_UNSUPPORTED" }
  | { readonly code: "UNSUPPORTED_VERSION"; readonly phase: "decode"; readonly retryability: "NEVER"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "VERSION_UNSUPPORTED" }
  | { readonly code: "UNKNOWN_REQUIRED_FIELD"; readonly phase: "decode"; readonly retryability: "NEVER"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "UNKNOWN_FIELD" }
  | { readonly code: "CURRENT_WORLD_MISMATCH"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "SCOPE_DENIED" }
  | { readonly code: "CATALOGUE_MISMATCH"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "CATALOGUE_UNRESOLVED" }
  | { readonly code: "UNSUPPORTED_MUTATION_SEMANTICS"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "REQUIRED_FACT_UNKNOWN" }
  | { readonly code: "LIMIT_EXCEEDED"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "LIMIT_EXCEEDED" };
export type BuildDefensiveError =
    { readonly code: "TARGET_FACTS_STALE"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "REVISION_CHANGED" }
  | { readonly code: "NON_CANONICAL_AMBIGUITY"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "PAYLOAD_CHANGED" };
export type CompileRegionDefensiveError =
    { readonly code: "TRANSACTION_CONFLICT"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "PAYLOAD_CHANGED" }
  | { readonly code: "BUILD_INVALID"; readonly phase: "validate"; readonly retryability: "AFTER_NEW_FACTS"; readonly mutationState: "NONE"; readonly transactionRef: null; readonly causeCode: null; readonly reason: "INVALID_GEOMETRY" };
export type Error = BuildOrdinaryError | BuildDefensiveError;
export type CompileRegionError = CompileRegionOrdinaryError | CompileRegionDefensiveError;
export type ErrorCode = "SCHEMA_INVALID" | "NON_CANONICAL_AMBIGUITY" | "CAPABILITY_GAP" | "UNSUPPORTED_VERSION" | "UNKNOWN_REQUIRED_FIELD" | "CURRENT_WORLD_MISMATCH" | "TRANSACTION_CONFLICT" | "CATALOGUE_MISMATCH" | "TARGET_FACTS_INCOMPLETE" | "UNSUPPORTED_MUTATION_SEMANTICS" | "LIMIT_EXCEEDED" | "CAPABILITY_UNAVAILABLE" | "SAFETY_INVARIANT_FAILED";
export type CompileRegionErrorCode = "SCHEMA_INVALID" | "CAPABILITY_GAP" | "NON_CANONICAL_AMBIGUITY" | "UNSUPPORTED_VERSION" | "UNKNOWN_REQUIRED_FIELD" | "CURRENT_WORLD_MISMATCH" | "CATALOGUE_MISMATCH" | "UNSUPPORTED_MUTATION_SEMANTICS" | "LIMIT_EXCEEDED";
export type BuildDefensiveErrorCode = "TARGET_FACTS_STALE" | "NON_CANONICAL_AMBIGUITY";
export type CompileRegionDefensiveErrorCode = "TRANSACTION_CONFLICT" | "BUILD_INVALID";
export type BuildDocumentResponse = { readonly contractVersion: "BUILD/V5"; readonly requestId: Ref; readonly result: CompiledOperationSet; readonly error: null } | { readonly contractVersion: "BUILD/V5"; readonly requestId: Ref; readonly result: null; readonly error: Error };
export type CompileRegionBuildResponse = { readonly contractVersion: "region-build/v2"; readonly requestId: Ref; readonly result: CompiledRegionSet; readonly error: null } | { readonly contractVersion: "region-build/v2"; readonly requestId: Ref; readonly result: null; readonly error: CompileRegionError };

export type WireVersions = ReadonlyArray<Ref>;
export type FactProfiles = ReadonlyArray<Ref>;
export type RefSet = ReadonlyArray<Ref>;
export type ContractHandshake = { readonly contracts: Ref; readonly wireVersions: WireVersions; readonly compiledOperationsVersion: "operations/v4"; readonly factProfiles: FactProfiles };
export type ProtocolDescriptor = { readonly protocol: Ref; readonly major: PositiveInt; readonly minor: NonNegativeInt };
export type ProtocolDescriptors = ReadonlyArray<ProtocolDescriptor>;
export type ProtocolProvenance = { readonly packageName: Ref; readonly packageVersion: Ref; readonly sourceRevision: Ref | null; readonly artifactDigest: Digest | null };
export type ProtocolHandshake = { readonly profileVersion: "protocol-handshake/v1"; readonly component: Ref; readonly protocols: ProtocolDescriptors; readonly capabilities: RefSet; readonly provenance: ProtocolProvenance };
