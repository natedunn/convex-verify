// =============================================================================
// Core
// =============================================================================

export { verifyConfig } from './core';
import {
	createExtension as createExtensionImpl,
	isExtension as isExtensionImpl,
	runExtensions as runExtensionsImpl,
} from './core';

export const createExtension = createExtensionImpl;
export const isExtension = isExtensionImpl;
export const runExtensions = runExtensionsImpl;
export type {
	ExtensionContext,
	ExtensionInput,
	ExtensionInputForSchema,
	Extension,
	ExtensionRecord,
	SchemaExtension,
} from './core';
export type {
	// Utility types
	Prettify,
	MakeOptional,
	// Data model helpers
	DataModelForSchema,
	MutationCtxForSchema,
	// OnFail types
	OnFailArgs,
	OnFailCallback,
	// Config data types
	DefaultValuesConfigData,
	DefaultValuesConfigInput,
	ProtectedColumnsConfigData,
	// VerifyConfig types
	VerifyConfigInput,
	// Type extraction helpers
	ExtractDefaultValuesConfig,
	OptionalKeysForTable,
	HasKey,
	ExtractProtectedColumnsConfig,
	ProtectedKeysForTable,
	// Direct verify types
	VerifyInsertInput,
	VerifyPatchInput,
	DefaultValuesVerifyFn,
	ProtectedColumnsVerifyFn,
	ExtensionStyleVerifyFn,
	BuiltinConfigKey,
	VerifyRegistry,
	ConfigRegistry,
} from './core';
export type {
	UniqueRowConfigData,
	UniqueRowConfigEntry,
	UniqueRowConfigOptions,
	UniqueColumnConfigData,
	UniqueColumnConfigEntry,
	UniqueColumnConfigOptions,
} from './core';

// =============================================================================
// Utils
// =============================================================================

export { getTableIndexes, constructColumnData, constructIndexData } from './utils';
export { normalizeIndexConfigEntry } from './utils';
export type { NormalizedIndexConfig, IndexConfigBaseOptions, IndexConfigEntry } from './utils';
