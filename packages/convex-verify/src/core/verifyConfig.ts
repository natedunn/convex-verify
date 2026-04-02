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

import { runValidatePlugins, ValidatePlugin } from "./plugin";
import {
	HasKey,
	MakeOptional,
	OnFailCallback,
	OptionalKeysForTable,
	ProtectedKeysForTable,
	VerifyConfigInput,
} from "./types";

/**
 * Extended config input that includes optional validate plugins
 */
type VerifyConfigInputWithPlugins = VerifyConfigInput & {
	/**
	 * Unique row validation config.
	 * Enforces uniqueness across multiple columns using composite indexes.
	 *
	 * Can also be added to the `plugins` array.
	 */
	uniqueRow?: ValidatePlugin<"uniqueRow", any>;

	/**
	 * Unique column validation config.
	 * Enforces uniqueness on single columns using indexes.
	 *
	 * Can also be added to the `plugins` array.
	 */
	uniqueColumn?: ValidatePlugin<"uniqueColumn", any>;

	/**
	 * Additional plugins to run after transform configs (defaultValues, etc.).
	 * These plugins can validate data, transform/mutate it, or both.
	 * Custom plugins run before built-in uniqueness plugins so the built-ins
	 * validate the final transformed payload.
	 * Plugins run in order; each receives the (possibly transformed) output of the previous.
	 *
	 * Built-in plugins (uniqueRow, uniqueColumn) can be added here
	 * as an alternative to using their dedicated config keys when you need
	 * explicit ordering.
	 */
	plugins?: ValidatePlugin[];
};

/**
 * Configure type-safe insert and patch functions with validation and transforms.
 *
 * @param schema - Your Convex schema definition
 * @param configs - Configuration object with transforms, configs, and plugins
 * @returns Object with `insert`, `patch`, and `dangerouslyPatch` functions
 *
 * @example
 * ```ts
 * import {
 *   verifyConfig,
 *   defaultValuesConfig,
 *   protectedColumnsConfig,
 *   uniqueRowConfig,
 *   uniqueColumnConfig,
 * } from 'convex-verify';
 * import schema from './schema';
 *
 * export const { insert, patch, dangerouslyPatch } = verifyConfig(schema, {
 *   // Type-affecting configs
 *   defaultValues: defaultValuesConfig(schema, () => ({
 *     posts: { status: 'draft', views: 0 },
 *   })),
 *   protectedColumns: protectedColumnsConfig(schema, {
 *     posts: ['authorId'],
 *   }),
 *
 *   // Built-in validation configs
 *   uniqueRow: uniqueRowConfig(schema, {
 *     posts: ['by_author_slug'],
 *   }),
 *   uniqueColumn: uniqueColumnConfig(schema, {
 *     users: ['by_email', 'by_username'],
 *   }),
 *
 *   // Custom/third-party plugins
 *   plugins: [myCustomPlugin()],
 * });
 * ```
 */
export const verifyConfig = <
	S extends GenericSchema,
	DataModel extends DataModelFromSchemaDefinition<SchemaDefinition<S, boolean>>,
	const VC extends VerifyConfigInputWithPlugins,
>(
	_schema: SchemaDefinition<S, boolean>,
	configs: VC,
) => {
	const customPlugins = configs.plugins ?? [];
	const builtInValidatePlugins: ValidatePlugin[] = [
		...(configs.uniqueRow ? [configs.uniqueRow] : []),
		...(configs.uniqueColumn ? [configs.uniqueColumn] : []),
	];
	// Run custom plugins first so built-in uniqueness checks validate transformed data.
	const validatePlugins: ValidatePlugin[] = [...customPlugins, ...builtInValidatePlugins];
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

	/**
	 * Insert a document with all configured verifications applied.
	 *
	 * Execution order:
	 * 1. Transform: defaultValues (makes fields optional, applies defaults)
	 * 2. Plugins: run in order (can validate, transform, or both)
	 * 3. Insert into database
	 */
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
		let verifiedData = data as WithoutSystemFields<
			DocumentByName<DataModel, TN>
		>;

		// === TRANSFORM PHASE ===

		// Apply default values (transforms data)
		if (configs.defaultValues) {
			verifiedData = await configs.defaultValues.verify(
				tableName,
				verifiedData,
			);
		}

		// === PLUGIN PHASE ===

		// Run all plugins
		if (validatePlugins.length > 0) {
			verifiedData = await runValidatePlugins(
				validatePlugins,
				{
					ctx,
					tableName: tableName as string,
					operation: "insert",
					onFail: options?.onFail,
					schema: _schema,
				},
				verifiedData,
			);
		}

		// Final insert
		return await ctx.db.insert(tableName, verifiedData);
	};

	/**
	 * Patch a document with all configured verifications applied.
	 *
	 * Protected columns (if configured) are removed from the input type.
	 * Use dangerouslyPatch() to bypass protected column restrictions.
	 *
	 * Execution order:
	 * 1. Protected columns are stripped from the patch payload
	 * 2. Plugins: run in order (can validate, transform, or both)
	 * 3. Protected columns are stripped again if plugins reintroduced them
	 * 4. Patch in database
	 *
	 * Note: defaultValues is skipped for patch operations
	 */
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
			let verifiedData = data as Partial<
				WithoutSystemFields<DocumentByName<DataModel, TN>>
			>;
			const removedProtectedColumns = new Set<string>();

			const stripProtectedColumns = () => {
				const filtered = stripProtectedPatchColumns(tableName as string, verifiedData);
				for (const column of filtered.removedColumns) {
					removedProtectedColumns.add(column);
				}
				verifiedData = filtered.filteredData;
			};

			// Enforce protected columns at runtime in addition to the patch() input type.
			stripProtectedColumns();

			// === PLUGIN PHASE ===

			// Run all plugins
			if (validatePlugins.length > 0) {
				verifiedData = await runValidatePlugins(
					validatePlugins,
					{
						ctx,
						tableName: tableName as string,
						operation: "patch",
						patchId: id,
						onFail: options?.onFail,
						schema: _schema,
					},
					verifiedData,
				);
			}

			// Plugins may reintroduce protected columns; strip them again.
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

	/**
	 * Patch a document bypassing protected column restrictions.
	 *
	 * WARNING: This allows patching ANY column, including protected ones.
	 * Only use this when you explicitly need to update a protected column.
	 *
	 * Validation plugins still run - only type restrictions are bypassed.
	 */
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

		// === PLUGIN PHASE ===

		// Run all plugins (protection is bypassed, but validation still runs)
		if (validatePlugins.length > 0) {
			verifiedData = await runValidatePlugins(
				validatePlugins,
				{
					ctx,
					tableName: tableName as string,
					operation: "patch",
					patchId: id,
					onFail: options?.onFail,
					schema: _schema,
				},
				verifiedData,
			);
		}

		await ctx.db.patch(id, verifiedData);
	};

	return {
		insert,
		patch,
		dangerouslyPatch,
		// Expose configs for debugging/advanced usage
		configs,
	};
};
