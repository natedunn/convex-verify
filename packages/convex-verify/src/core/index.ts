// Main verifyConfig function
export { verifyConfig } from './verifyConfig';
export { stripProtectedPatchColumns } from './builtins';

// Extension system
import {
	createExtension as createExtensionImpl,
	isExtension as isExtensionImpl,
	runExtensions as runExtensionsImpl,
} from './plugin';

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
} from './plugin';

// All types
export type {
	// Utility types
	Prettify,
	MakeOptional,
	// Base types
	BaseConfigReturn,
	// OnFail types
	OnFailArgs,
	OnFailCallback,
	// Config data types
	DMGeneric,
	DataModelForSchema,
	MutationCtxForSchema,
	DefaultValuesConfigData,
	DefaultValuesConfigInput,
	ProtectedColumnsConfigData,
	// Index-based config types
	IndexConfigBaseOptions,
	IndexConfigEntry,
	NormalizedIndexConfig,
	// UniqueRow types
	UniqueRowConfigOptions,
	UniqueRowConfigEntry,
	UniqueRowConfigData,
	// UniqueColumn types
	UniqueColumnConfigOptions,
	UniqueColumnConfigEntry,
	UniqueColumnConfigData,
	// VerifyConfig types
	VerifyConfigInput,
	// Type extraction helpers
	ExtractDefaultValuesConfig,
	OptionalKeysForTable,
	HasKey,
	ExtractProtectedColumnsConfig,
	ProtectedKeysForTable,
	VerifyInsertInput,
	VerifyPatchInput,
	DefaultValuesVerifyFn,
	ProtectedColumnsVerifyFn,
	ExtensionStyleVerifyFn,
	BuiltinConfigKey,
	VerifyRegistry,
	ConfigRegistry,
} from './types';

// Utility function
export { normalizeIndexConfigEntry } from './types';
