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

import { runExtensions, SchemaExtension } from "./plugin";
import {
	HasKey,
	MakeOptional,
	OnFailCallback,
	OptionalKeysForTable,
	ProtectedKeysForTable,
	VerifyConfigInput,
} from "./types";

/**
 * Extended config input that includes optional extensions.
 */
type VerifyConfigInputWithExtensions<S extends SchemaDefinition<GenericSchema, boolean>> =
	VerifyConfigInput & {
	/**
	 * Unique row validation config.
	 * Enforces uniqueness across multiple columns using composite indexes.
	 *
	 * Can also be added to the `extensions` array.
	 */
	uniqueRow?: SchemaExtension<S, "uniqueRow", any>;

	/**
	 * Unique column validation config.
	 * Enforces uniqueness on single columns using indexes.
	 *
	 * Can also be added to the `extensions` array.
	 */
	uniqueColumn?: SchemaExtension<S, "uniqueColumn", any>;

	/**
	 * Additional extensions to run after transform configs (defaultValues, etc.).
	 * These extensions can validate data, transform/mutate it, or both.
	 * Custom extensions run before built-in uniqueness extensions so the built-ins
	 * validate the final transformed payload.
	 * Extensions run in order; each receives the (possibly transformed) output of the previous.
	 *
	 * Built-in extensions (uniqueRow, uniqueColumn) can be added here
	 * as an alternative to using their dedicated config keys when you need
	 * explicit ordering.
	 */
	extensions?: SchemaExtension<S>[];
};

/**
 * Configure type-safe insert and patch functions with validation and transforms.
 *
 * @param schema - Your Convex schema definition
 * @param configs - Configuration object with transforms, configs, and extensions
 * @returns Object with `insert`, `patch`, and `dangerouslyPatch` functions
 */
export const verifyConfig = <
	S extends GenericSchema,
	SD extends SchemaDefinition<S, boolean>,
	const VC extends VerifyConfigInputWithExtensions<SD>,
>(
	_schema: SD,
	configs: VC,
) => {
	type DataModel = DataModelFromSchemaDefinition<SD>;
	type SchemaScopedExtension = SchemaExtension<SD>;
	const customExtensions = configs.extensions ?? [];
	const builtInExtensions: SchemaScopedExtension[] = [
		...(configs.uniqueRow ? [configs.uniqueRow] : []),
		...(configs.uniqueColumn ? [configs.uniqueColumn] : []),
	];
	const extensions: SchemaScopedExtension[] = [...customExtensions, ...builtInExtensions];
	const protectedColumns = configs.protectedColumns?.config ?? {};

	const stripProtectedPatchColumns = <T extends Record<string, any>>(tableName: string, data: T) => {
		const protectedKeys = protectedColumns[tableName] ?? [];

		if (protectedKeys.length === 0) {
			return {
				filteredData: data,
				removedColumns: [] as string[],
			};
		}

		const removedColumns = protectedKeys.filter((key) => key in data).map(String);
		if (removedColumns.length === 0) {
			return {
				filteredData: data,
				removedColumns,
			};
		}

		const filteredData = Object.fromEntries(
			Object.entries(data).filter(([key]) => !protectedKeys.includes(key as string))
		) as T;

		return {
			filteredData,
			removedColumns,
		};
	};

	const insert = async <
		const TN extends TableNamesInDataModel<DataModel>,
		const D extends DocumentByName<DataModel, TN>,
	>(
		ctx: Omit<GenericMutationCtx<DataModel>, never>,
		tableName: TN,
		data: HasKey<VC, "defaultValues"> extends true
			? MakeOptional<
					WithoutSystemFields<D>,
					OptionalKeysForTable<VC, TN> & keyof WithoutSystemFields<D>
				>
			: WithoutSystemFields<D>,
		options?: {
			onFail?: OnFailCallback<D>;
		},
	): Promise<GenericId<TN>> => {
		let verifiedData = data as WithoutSystemFields<DocumentByName<DataModel, TN>>;

		if (configs.defaultValues) {
			verifiedData = await configs.defaultValues.verify(tableName, verifiedData);
		}

		if (extensions.length > 0) {
			verifiedData = (await runExtensions(
				extensions,
				{
					ctx,
					tableName,
					operation: "insert",
					onFail: options?.onFail,
					schema: _schema,
					data: verifiedData,
				},
			)) as typeof verifiedData;
		}

		return await ctx.db.insert(tableName, verifiedData);
	};

	const patch = async <
		const TN extends TableNamesInDataModel<DataModel>,
		const D extends DocumentByName<DataModel, TN>,
	>(
		ctx: Omit<GenericMutationCtx<DataModel>, never>,
		tableName: TN,
		id: GenericId<TN>,
		data: HasKey<VC, "protectedColumns"> extends true
			? Omit<
					Partial<WithoutSystemFields<D>>,
					ProtectedKeysForTable<VC, TN> & keyof WithoutSystemFields<D>
				>
			: Partial<WithoutSystemFields<D>>,
		options?: {
			onFail?: OnFailCallback<D>;
		},
	): Promise<void> => {
		let verifiedData = data as Partial<WithoutSystemFields<DocumentByName<DataModel, TN>>>;
		const removedProtectedColumns = new Set<string>();

		const stripProtectedColumns = () => {
			const filtered = stripProtectedPatchColumns(tableName as string, verifiedData);
			for (const column of filtered.removedColumns) {
				removedProtectedColumns.add(column);
			}
			verifiedData = filtered.filteredData;
		};

		stripProtectedColumns();

		if (extensions.length > 0) {
			verifiedData = (await runExtensions(
				extensions,
				{
					ctx,
					tableName,
					operation: "patch",
					patchId: id,
					onFail: options?.onFail,
					schema: _schema,
					data: verifiedData,
				},
			)) as typeof verifiedData;
		}

		stripProtectedColumns();
		if (removedProtectedColumns.size > 0) {
			options?.onFail?.({
				editableColumn: {
					removedColumns: [...removedProtectedColumns],
					filteredData: verifiedData as D,
				},
			});
		}

		await ctx.db.patch(id, verifiedData);
	};

	const dangerouslyPatch = async <
		const TN extends TableNamesInDataModel<DataModel>,
		const D extends DocumentByName<DataModel, TN>,
	>(
		ctx: Omit<GenericMutationCtx<DataModel>, never>,
		tableName: TN,
		id: GenericId<TN>,
		data: Partial<WithoutSystemFields<D>>,
		options?: {
			onFail?: OnFailCallback<D>;
		},
	): Promise<void> => {
		let verifiedData = data;

		if (extensions.length > 0) {
			verifiedData = (await runExtensions(
				extensions,
				{
					ctx,
					tableName,
					operation: "patch",
					patchId: id,
					onFail: options?.onFail,
					schema: _schema,
					data: verifiedData,
				},
			)) as typeof verifiedData;
		}

		await ctx.db.patch(id, verifiedData);
	};

	return {
		insert,
		patch,
		dangerouslyPatch,
	};
};
