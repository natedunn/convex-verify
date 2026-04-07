import {
	DataModelFromSchemaDefinition,
	DocumentByName,
	GenericMutationCtx,
	GenericSchema,
	SchemaDefinition,
	TableNamesInDataModel,
	WithoutSystemFields,
} from "convex/server";
import { GenericId } from "convex/values";

import { DMGeneric, OnFailCallback } from "./types";

type MaybePromise<T> = T | Promise<T>;

type MutationCtx<DM extends DMGeneric = DMGeneric> = Omit<GenericMutationCtx<DM>, never>;

export type InsertExtensionContext<
	TN extends string = string,
	DM extends DMGeneric = DMGeneric,
	S extends SchemaDefinition<GenericSchema, boolean> = SchemaDefinition<GenericSchema, boolean>,
> = {
	ctx: MutationCtx<DM>;
	tableName: TN;
	operation: "insert";
	onFail?: OnFailCallback<any>;
	schema: S;
	patchId?: undefined;
};

export type PatchExtensionContext<
	TN extends string = string,
	DM extends DMGeneric = DMGeneric,
	S extends SchemaDefinition<GenericSchema, boolean> = SchemaDefinition<GenericSchema, boolean>,
> = {
	ctx: MutationCtx<DM>;
	tableName: TN;
	operation: "patch";
	patchId: GenericId<TN>;
	onFail?: OnFailCallback<any>;
	schema: S;
};

export type ExtensionContext<
	TN extends string = string,
	DM extends DMGeneric = DMGeneric,
	S extends SchemaDefinition<GenericSchema, boolean> = SchemaDefinition<GenericSchema, boolean>,
> = InsertExtensionContext<TN, DM, S> | PatchExtensionContext<TN, DM, S>;

export type ExtensionInput<
	TData = unknown,
	TContext = ExtensionContext,
> = TContext & {
	data: TData;
};

type ExtensionInputBase = {
	data: unknown;
};

type DataModelForSchema<S extends SchemaDefinition<GenericSchema, boolean>> =
	DataModelFromSchemaDefinition<S>;

export type ExtensionInputForSchema<S extends SchemaDefinition<GenericSchema, boolean>> = {
	[TN in TableNamesInDataModel<DataModelForSchema<S>>]:
		| ExtensionInput<
				WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>,
				InsertExtensionContext<TN, DataModelForSchema<S>, S>
		  >
		| ExtensionInput<
				Partial<WithoutSystemFields<DocumentByName<DataModelForSchema<S>, TN>>>,
				PatchExtensionContext<TN, DataModelForSchema<S>, S>
		  >;
}[TableNamesInDataModel<DataModelForSchema<S>>];

export type ExtensionVerify<TInput extends ExtensionInputBase = ExtensionInput> = (
	input: TInput,
) => MaybePromise<TInput["data"]>;

export type ExtensionRecord<
	TType extends string = string,
	TConfig = unknown,
	TInput extends ExtensionInputBase = ExtensionInput,
> = {
	readonly _type: TType;
	readonly config?: TConfig;
	verify(input: TInput): MaybePromise<TInput["data"]>;
};

export type Extension<TInput extends ExtensionInputBase = ExtensionInput> = ExtensionRecord<
	"extension",
	undefined,
	TInput
>;

export type SchemaExtension<
	S extends SchemaDefinition<GenericSchema, boolean>,
	TType extends string = string,
	TConfig = unknown,
> = ExtensionRecord<TType, TConfig, ExtensionInputForSchema<S>>;

export function createExtension<const S extends SchemaDefinition<GenericSchema, boolean>>(
	verify: ExtensionVerify<ExtensionInputForSchema<S>>,
): Extension<ExtensionInputForSchema<S>>;
export function createExtension<const S extends SchemaDefinition<GenericSchema, boolean>>(
	schema: S,
	verify: ExtensionVerify<ExtensionInputForSchema<S>>,
): Extension<ExtensionInputForSchema<S>>;
export function createExtension(verify: ExtensionVerify): Extension;
export function createExtension(
	schemaOrVerify: SchemaDefinition<GenericSchema, boolean> | ((input: any) => MaybePromise<any>),
	verify?: (input: any) => MaybePromise<any>,
): Extension {
	const extensionVerify =
		typeof verify === "function"
			? verify
			: (schemaOrVerify as (input: any) => MaybePromise<any>);

	return {
		_type: "extension",
		verify(input) {
			return extensionVerify(input);
		},
	};
}

export function isExtension(value: unknown): value is ExtensionRecord {
	return (
		typeof value === "object" &&
		value !== null &&
		"verify" in value &&
		typeof (value as { verify?: unknown }).verify === "function"
	);
}

export async function runExtensions<
	TExtensionInput extends ExtensionInputBase,
	TInput extends TExtensionInput,
>(
	extensions: readonly ExtensionRecord<string, unknown, TExtensionInput>[],
	input: TInput,
): Promise<TInput["data"]> {
	let verifiedData: unknown = input.data;

	for (const extension of extensions) {
		verifiedData = await extension.verify({
			...input,
			data: verifiedData,
		} as TExtensionInput);
	}

	return verifiedData as TInput["data"];
}
