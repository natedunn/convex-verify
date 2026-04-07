import {
	DataModelFromSchemaDefinition,
	DocumentByName,
	GenericDocument,
	GenericMutationCtx,
	GenericSchema,
	Indexes,
	NamedTableInfo,
	SchemaDefinition,
	TableNamesInDataModel,
	WithoutSystemFields,
} from 'convex/server';
import { GenericId } from 'convex/values';

// =============================================================================
// Utility Types
// =============================================================================

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type MakeOptional<T, K extends PropertyKey> = Prettify<
	Omit<T, K & keyof T> & Partial<Pick<T, K & keyof T>>
>;

export type MaybePromise<T> = T | Promise<T>;

export type Exact<T, Shape> = T extends Shape
	? T extends (...args: any[]) => any
		? T
		: T extends readonly any[]
			? T
			: T extends object
				? {
						[K in keyof T]: K extends keyof NonNullable<Shape>
							? Exact<T[K], NonNullable<Shape>[K]>
							: never;
				  } & {
						[K in Exclude<keyof NonNullable<Shape>, keyof T>]?: NonNullable<Shape>[K];
				  }
				: T
	: never;

// =============================================================================
// Base Types
// =============================================================================

export type BaseConfigReturn = {
	config: Record<string, any>;
};

export type DMGeneric = DataModelFromSchemaDefinition<SchemaDefinition<any, boolean>>;

export type DataModelForSchema<S extends SchemaDefinition<GenericSchema, boolean>> =
	DataModelFromSchemaDefinition<S>;

export type MutationCtxForSchema<S extends SchemaDefinition<GenericSchema, boolean>> = Omit<
	GenericMutationCtx<DataModelForSchema<S>>,
	never
>;

// =============================================================================
// OnFail Types
// =============================================================================

export type OnFailArgs<D extends GenericDocument> = {
	uniqueColumn?: {
		conflictingColumn: keyof D;
		existingData: D;
	};
	uniqueRow?: {
		existingData: D | null;
	};
	editableColumn?: {
		removedColumns: string[];
		filteredData: Partial<WithoutSystemFields<D>>;
	};
	requiredColumn?: {
		missingColumn: keyof D;
	};
};

export type OnFailCallback<D extends GenericDocument> = (args: OnFailArgs<D>) => void;

// =============================================================================
// Config Data Types
// =============================================================================

export type DefaultValuesConfigData<DM extends DMGeneric> = {
	[K in keyof DM]?: {
		[column in keyof WithoutSystemFields<DM[K]['document']>]?: DM[K]['document'][column];
	};
};

export type DefaultValuesConfigInput<DM extends DMGeneric> =
	| DefaultValuesConfigData<DM>
	| (() => DefaultValuesConfigData<DM> | Promise<DefaultValuesConfigData<DM>>);

export type ProtectedColumnsConfigData<DM extends DMGeneric> = {
	[K in keyof DM]?: (keyof WithoutSystemFields<DM[K]['document']>)[];
};

// =============================================================================
// Index-Based Config Types
// =============================================================================

export type IndexConfigBaseOptions = {
	identifiers?: string[];
};

export type IndexConfigEntry<
	DM extends DMGeneric,
	K extends keyof DM,
	Options extends IndexConfigBaseOptions = IndexConfigBaseOptions,
> =
	| keyof Indexes<NamedTableInfo<DM, K>>
	| ({
			index: keyof Indexes<NamedTableInfo<DM, K>>;
			identifiers?: (keyof NamedTableInfo<DM, K>['document'])[];
	  } & Omit<Options, 'identifiers'>);

export type NormalizedIndexConfig<Options extends IndexConfigBaseOptions = IndexConfigBaseOptions> =
	{
		index: string;
		identifiers: string[];
	} & Omit<Options, 'identifiers'>;

export function normalizeIndexConfigEntry<
	Options extends IndexConfigBaseOptions = IndexConfigBaseOptions,
>(
	entry: string | ({ index: string; identifiers?: string[] } & Omit<Options, 'identifiers'>),
	defaultIdentifiers: string[] = ['_id']
): NormalizedIndexConfig<Options> {
	if (typeof entry === 'string') {
		return {
			index: entry,
			identifiers: defaultIdentifiers,
		} as NormalizedIndexConfig<Options>;
	}

	const { index, identifiers, ...rest } = entry;
	return {
		index: String(index),
		identifiers: identifiers?.map(String) ?? defaultIdentifiers,
		...rest,
	} as NormalizedIndexConfig<Options>;
}

// =============================================================================
// UniqueRow Config Types
// =============================================================================

export type UniqueRowConfigOptions = IndexConfigBaseOptions & {
	queryExistingWithNullish?: boolean;
};

export type UniqueRowConfigEntry<DM extends DMGeneric, K extends keyof DM> = IndexConfigEntry<
	DM,
	K,
	UniqueRowConfigOptions
>;

export type UniqueRowConfigData<DM extends DMGeneric> = {
	[K in keyof DM]?: UniqueRowConfigEntry<DM, K>[];
};

// =============================================================================
// UniqueColumn Config Types
// =============================================================================

export type UniqueColumnConfigOptions = IndexConfigBaseOptions;

export type UniqueColumnConfigEntry<DM extends DMGeneric, K extends keyof DM> = IndexConfigEntry<
	DM,
	K,
	UniqueColumnConfigOptions
>;

export type UniqueColumnConfigData<DM extends DMGeneric> = {
	[K in keyof DM]?: UniqueColumnConfigEntry<DM, K>[];
};

// =============================================================================
// VerifyConfig Types
// =============================================================================

export type VerifyConfigInput<S extends SchemaDefinition<GenericSchema, boolean>> = {
	defaultValues?: DefaultValuesConfigInput<DataModelForSchema<S>>;
	protectedColumns?: ProtectedColumnsConfigData<DataModelForSchema<S>>;
	uniqueRow?: UniqueRowConfigData<DataModelForSchema<S>>;
	uniqueColumn?: UniqueColumnConfigData<DataModelForSchema<S>>;
};

export type DefaultValuesParameter<
	S extends SchemaDefinition<GenericSchema, boolean>,
	DV,
> =
	ValidateDefaultValuesInput<S, DV>;

export type VerifyConfigSections<
	S extends SchemaDefinition<GenericSchema, boolean>,
	DV = never,
	PC = never,
	UR = never,
	UC = never,
	E = never,
> = {
	defaultValues?: DefaultValuesParameter<S, DV>;
	protectedColumns?: Exact<PC, ProtectedColumnsConfigData<DataModelForSchema<S>>>;
	uniqueRow?: Exact<UR, UniqueRowConfigData<DataModelForSchema<S>>>;
	uniqueColumn?: Exact<UC, UniqueColumnConfigData<DataModelForSchema<S>>>;
	extensions?: E;
};

export type VerifyConfigShapeFromGenerics<
	S extends SchemaDefinition<GenericSchema, boolean>,
	DV,
	PC,
	UR,
	UC,
	E,
> = Prettify<
	([DV] extends [never] ? {} : { defaultValues: DefaultValuesParameter<S, DV> }) &
		([PC] extends [never]
			? {}
			: { protectedColumns: Exact<PC, ProtectedColumnsConfigData<DataModelForSchema<S>>> }) &
		([UR] extends [never]
			? {}
			: { uniqueRow: Exact<UR, UniqueRowConfigData<DataModelForSchema<S>>> }) &
		([UC] extends [never]
			? {}
			: { uniqueColumn: Exact<UC, UniqueColumnConfigData<DataModelForSchema<S>>> }) &
		([E] extends [never] ? {} : { extensions: E })
>;

type AllowedVerifyConfigKeys =
	| 'defaultValues'
	| 'protectedColumns'
	| 'uniqueRow'
	| 'uniqueColumn'
	| 'extensions';

export type ValidateDefaultValuesInput<
	S extends SchemaDefinition<GenericSchema, boolean>,
	V,
> = V extends () => Promise<infer R>
	? () => Promise<Exact<R, DefaultValuesConfigData<DataModelForSchema<S>>>>
	: V extends () => infer R
		? () => Exact<R, DefaultValuesConfigData<DataModelForSchema<S>>>
		: Exact<V, DefaultValuesConfigData<DataModelForSchema<S>>>;

export type ValidateVerifyConfig<
	S extends SchemaDefinition<GenericSchema, boolean>,
	VC,
> = VC extends object
	? {
			[K in keyof VC]: K extends 'defaultValues'
				? ValidateDefaultValuesInput<S, VC[K]>
				: K extends 'protectedColumns'
					? Exact<VC[K], ProtectedColumnsConfigData<DataModelForSchema<S>>>
					: K extends 'uniqueRow'
						? Exact<VC[K], UniqueRowConfigData<DataModelForSchema<S>>>
						: K extends 'uniqueColumn'
							? Exact<VC[K], UniqueColumnConfigData<DataModelForSchema<S>>>
							: K extends 'extensions'
								? VC[K]
								: never;
	  } & {
			[K in Exclude<keyof VC, AllowedVerifyConfigKeys>]: never;
	  }
	: never;

// =============================================================================
// Type Extraction Helpers
// =============================================================================

export type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;

export type ExtractDefaultValuesConfig<VC> = VC extends {
	defaultValues: infer C;
}
	? C extends () => infer R
		? Awaited<R>
		: C
	: Record<string, never>;

export type OptionalKeysForTable<VC, TN> = TN extends keyof ExtractDefaultValuesConfig<VC>
	? keyof ExtractDefaultValuesConfig<VC>[TN]
	: never;

export type ExtractProtectedColumnsConfig<VC> = VC extends {
	protectedColumns: infer C;
}
	? C
	: Record<string, never>;

export type ProtectedKeysForTable<VC, TN> = TN extends keyof ExtractProtectedColumnsConfig<VC>
	? ExtractProtectedColumnsConfig<VC>[TN] extends readonly (infer K)[]
		? K
		: never
	: never;

// =============================================================================
// Direct Verify Input Types
// =============================================================================

export type VerifyInsertInput<
	S extends SchemaDefinition<GenericSchema, boolean>,
	TN extends TableNamesInDataModel<DataModelForSchema<S>>,
	TData,
> = {
	ctx: MutationCtxForSchema<S>;
	tableName: TN;
	operation: 'insert';
	onFail?: OnFailCallback<DocumentByName<DataModelForSchema<S>, TN>>;
	schema: S;
	patchId?: undefined;
	data: TData;
};

export type VerifyPatchInput<
	S extends SchemaDefinition<GenericSchema, boolean>,
	TN extends TableNamesInDataModel<DataModelForSchema<S>>,
	TData,
> = {
	ctx: MutationCtxForSchema<S>;
	tableName: TN;
	operation: 'patch';
	patchId: GenericId<TN>;
	onFail?: OnFailCallback<DocumentByName<DataModelForSchema<S>, TN>>;
	schema: S;
	data: TData;
};

export type ExtensionStyleVerifyFn<S extends SchemaDefinition<GenericSchema, boolean>> = {
	<TN extends TableNamesInDataModel<DataModelForSchema<S>>>(
		input: VerifyInsertInput<
			S,
			TN,
			WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>
		>,
	): Promise<WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>>;
	<TN extends TableNamesInDataModel<DataModelForSchema<S>>>(
		input: VerifyPatchInput<
			S,
			TN,
			Partial<WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>>
		>,
	): Promise<Partial<WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>>>;
};

export type DefaultValuesVerifyFn<
	S extends SchemaDefinition<GenericSchema, boolean>,
	VC,
> = {
	<TN extends TableNamesInDataModel<DataModelForSchema<S>>>(
		tableName: TN,
		data: HasKey<VC, 'defaultValues'> extends true
			? MakeOptional<
					WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>,
					OptionalKeysForTable<VC, TN> &
						keyof WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>
				>
			: WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>,
	): Promise<WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>>;
	<TN extends TableNamesInDataModel<DataModelForSchema<S>>>(
		input: VerifyInsertInput<
			S,
			TN,
			HasKey<VC, 'defaultValues'> extends true
				? MakeOptional<
						WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>,
						OptionalKeysForTable<VC, TN> &
							keyof WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>
				  >
				: WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>
		>,
	): Promise<WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>>;
	<TN extends TableNamesInDataModel<DataModelForSchema<S>>>(
		input: VerifyPatchInput<
			S,
			TN,
			Partial<WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>>
		>,
	): Promise<Partial<WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>>>;
};

export type ProtectedColumnsVerifyFn<S extends SchemaDefinition<GenericSchema, boolean>> = {
	<TN extends TableNamesInDataModel<DataModelForSchema<S>>>(
		tableName: TN,
		data: Partial<WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>>,
	): Promise<Partial<WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>>>;
	<TN extends TableNamesInDataModel<DataModelForSchema<S>>>(
		input: VerifyInsertInput<
			S,
			TN,
			WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>
		>,
	): Promise<WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>>;
	<TN extends TableNamesInDataModel<DataModelForSchema<S>>>(
		input: VerifyPatchInput<
			S,
			TN,
			Partial<WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>>
		>,
	): Promise<Partial<WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>>>;
};

export type UniqueVerifyFn<S extends SchemaDefinition<GenericSchema, boolean>> = {
	<TN extends TableNamesInDataModel<DataModelForSchema<S>>, D extends Partial<
		WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>
	>>(
		ctx: MutationCtxForSchema<S>,
		tableName: TN,
		data: D,
	): Promise<D>;
	<TN extends TableNamesInDataModel<DataModelForSchema<S>>, D extends Partial<
		WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>
	>>(
		ctx: MutationCtxForSchema<S>,
		tableName: TN,
		patchId: GenericId<TN>,
		data: D,
	): Promise<D>;
	<TN extends TableNamesInDataModel<DataModelForSchema<S>>, D extends Partial<
		WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>
	>>(
		input: VerifyInsertInput<S, TN, D>,
	): Promise<D>;
	<TN extends TableNamesInDataModel<DataModelForSchema<S>>, D extends Partial<
		WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>
	>>(
		input: VerifyPatchInput<S, TN, D>,
	): Promise<D>;
};

export type BuiltinConfigKey =
	| 'defaultValues'
	| 'protectedColumns'
	| 'uniqueRow'
	| 'uniqueColumn';

export type VerifyFnForKey<
	S extends SchemaDefinition<GenericSchema, boolean>,
	VC,
	K extends BuiltinConfigKey,
> = K extends 'defaultValues'
	? DefaultValuesVerifyFn<S, VC>
	: K extends 'protectedColumns'
		? ProtectedColumnsVerifyFn<S>
		: UniqueVerifyFn<S>;

export type VerifyRegistry<
	S extends SchemaDefinition<GenericSchema, boolean>,
	VC,
> = Prettify<{
	[K in BuiltinConfigKey as HasKey<VC, K> extends true ? K : never]: VerifyFnForKey<S, VC, K>;
}>;

export type ConfigRegistry<VC> = Prettify<{
	[K in BuiltinConfigKey as HasKey<VC, K> extends true ? K : never]: K extends keyof VC ? VC[K] : never;
}>;
