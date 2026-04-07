import {
	DataModelFromSchemaDefinition,
	DocumentByName,
	GenericSchema,
	SchemaDefinition,
	TableNamesInDataModel,
	WithoutSystemFields,
} from 'convex/server';
import { GenericId } from 'convex/values';

import {
	buildDefaultValuesVerifier,
	buildProtectedColumnsVerifier,
	buildUniqueColumnVerifier,
	buildUniqueRowVerifier,
	stripProtectedPatchColumns,
} from './builtins';
import { runExtensions } from './plugin';
import {
	ConfigRegistry,
	HasKey,
	MakeOptional,
	MutationCtxForSchema,
	OnFailCallback,
	OptionalKeysForTable,
	ProtectedKeysForTable,
	ValidateDefaultValuesInput,
	ValidateVerifyConfig,
	VerifyConfigInput,
	VerifyRegistry,
} from './types';

export const verifyConfig = <
	S extends GenericSchema,
	SD extends SchemaDefinition<S, boolean>,
	const VC extends VerifyConfigInput<SD> & {
		extensions?: unknown;
	},
	const DV = never,
>(
	_schema: SD,
	configs: (Omit<VerifyConfigInput<SD>, 'defaultValues'> & {
		defaultValues?: ValidateDefaultValuesInput<SD, DV>;
	}) &
		ValidateVerifyConfig<SD, VC> &
		VC,
) => {
	type DataModel = DataModelFromSchemaDefinition<SD>;
	type VCForTypes = Omit<VC, 'defaultValues'> &
		([DV] extends [never] ? {} : { defaultValues: ValidateDefaultValuesInput<SD, DV> });

	const builtins = {
		...(configs.defaultValues
			? {
					defaultValues: buildDefaultValuesVerifier<
						SD,
						NonNullable<typeof configs.defaultValues>
					>(configs.defaultValues),
				}
			: {}),
		...(configs.protectedColumns
			? {
					protectedColumns: buildProtectedColumnsVerifier<
						SD,
						NonNullable<typeof configs.protectedColumns>
					>(configs.protectedColumns),
				}
			: {}),
		...(configs.uniqueRow
			? {
					uniqueRow: buildUniqueRowVerifier<SD, NonNullable<typeof configs.uniqueRow>>(
						_schema,
						configs.uniqueRow,
					),
				}
			: {}),
		...(configs.uniqueColumn
			? {
					uniqueColumn: buildUniqueColumnVerifier<
						SD,
						NonNullable<typeof configs.uniqueColumn>
					>(configs.uniqueColumn),
				}
			: {}),
	};

	const verify = {
		...(builtins.defaultValues ? { defaultValues: builtins.defaultValues.verify } : {}),
		...(builtins.protectedColumns ? { protectedColumns: builtins.protectedColumns.verify } : {}),
		...(builtins.uniqueRow ? { uniqueRow: builtins.uniqueRow.verify } : {}),
		...(builtins.uniqueColumn ? { uniqueColumn: builtins.uniqueColumn.verify } : {}),
	} as VerifyRegistry<SD, VCForTypes>;

	const config = {
		...(configs.defaultValues ? { defaultValues: configs.defaultValues } : {}),
		...(configs.protectedColumns ? { protectedColumns: configs.protectedColumns } : {}),
		...(configs.uniqueRow ? { uniqueRow: configs.uniqueRow } : {}),
		...(configs.uniqueColumn ? { uniqueColumn: configs.uniqueColumn } : {}),
	} as ConfigRegistry<VCForTypes>;

	const customExtensions = (configs.extensions ?? []) as readonly any[];

	const insert = async <
		const TN extends TableNamesInDataModel<DataModel>,
		const D extends DocumentByName<DataModel, TN>,
	>(
		ctx: MutationCtxForSchema<SD>,
		tableName: TN,
		data: HasKey<VCForTypes, 'defaultValues'> extends true
			? MakeOptional<
					WithoutSystemFields<D>,
					OptionalKeysForTable<VCForTypes, TN> & keyof WithoutSystemFields<D>
				>
			: WithoutSystemFields<D>,
		options?: {
			onFail?: OnFailCallback<D>;
		},
	): Promise<GenericId<TN>> => {
		let verifiedData = data as WithoutSystemFields<DocumentByName<DataModel, TN>>;

		if (builtins.defaultValues) {
			verifiedData = await builtins.defaultValues.verify({
				ctx,
				tableName,
				operation: 'insert',
				onFail: options?.onFail,
				schema: _schema,
				data: verifiedData as any,
			});
		}

		if (customExtensions.length > 0) {
			verifiedData = (await runExtensions(customExtensions, {
				ctx,
				tableName,
				operation: 'insert',
				onFail: options?.onFail,
				schema: _schema,
				data: verifiedData,
			})) as typeof verifiedData;
		}

		if (builtins.uniqueRow) {
			verifiedData = await builtins.uniqueRow.verify({
				ctx,
				tableName,
				operation: 'insert',
				onFail: options?.onFail,
				schema: _schema,
				data: verifiedData,
			});
		}

		if (builtins.uniqueColumn) {
			verifiedData = await builtins.uniqueColumn.verify({
				ctx,
				tableName,
				operation: 'insert',
				onFail: options?.onFail,
				schema: _schema,
				data: verifiedData,
			});
		}

		return await ctx.db.insert(tableName, verifiedData);
	};

	const patch = async <
		const TN extends TableNamesInDataModel<DataModel>,
		const D extends DocumentByName<DataModel, TN>,
	>(
		ctx: MutationCtxForSchema<SD>,
		tableName: TN,
		id: GenericId<TN>,
		data: HasKey<VCForTypes, 'protectedColumns'> extends true
			? Omit<
					Partial<WithoutSystemFields<D>>,
					ProtectedKeysForTable<VCForTypes, TN> & keyof WithoutSystemFields<D>
				>
			: Partial<WithoutSystemFields<D>>,
		options?: {
			onFail?: OnFailCallback<D>;
		},
	): Promise<void> => {
		let verifiedData = data as Partial<WithoutSystemFields<DocumentByName<DataModel, TN>>>;
		const removedProtectedColumns = new Set<string>();

		const stripProtectedColumns = () => {
			if (!builtins.protectedColumns) {
				return;
			}

			const filtered = stripProtectedPatchColumns(
				builtins.protectedColumns.config,
				tableName as string,
				verifiedData,
			);

			for (const column of filtered.removedColumns) {
				removedProtectedColumns.add(column);
			}

			verifiedData = filtered.filteredData;
		};

		stripProtectedColumns();

		if (customExtensions.length > 0) {
			verifiedData = (await runExtensions(customExtensions, {
				ctx,
				tableName,
				operation: 'patch',
				patchId: id,
				onFail: options?.onFail,
				schema: _schema,
				data: verifiedData,
			})) as typeof verifiedData;
		}

		if (builtins.uniqueRow) {
			verifiedData = await builtins.uniqueRow.verify({
				ctx,
				tableName,
				operation: 'patch',
				patchId: id,
				onFail: options?.onFail,
				schema: _schema,
				data: verifiedData,
			});
		}

		if (builtins.uniqueColumn) {
			verifiedData = await builtins.uniqueColumn.verify({
				ctx,
				tableName,
				operation: 'patch',
				patchId: id,
				onFail: options?.onFail,
				schema: _schema,
				data: verifiedData,
			});
		}

		stripProtectedColumns();
		if (removedProtectedColumns.size > 0) {
			options?.onFail?.({
				editableColumn: {
					removedColumns: [...removedProtectedColumns],
					filteredData: verifiedData,
				},
			});
		}

		await ctx.db.patch(id, verifiedData);
	};

	const dangerouslyPatch = async <
		const TN extends TableNamesInDataModel<DataModel>,
		const D extends DocumentByName<DataModel, TN>,
	>(
		ctx: MutationCtxForSchema<SD>,
		tableName: TN,
		id: GenericId<TN>,
		data: Partial<WithoutSystemFields<D>>,
		options?: {
			onFail?: OnFailCallback<D>;
		},
	): Promise<void> => {
		let verifiedData = data as Partial<WithoutSystemFields<DocumentByName<DataModel, TN>>>;

		if (customExtensions.length > 0) {
			verifiedData = (await runExtensions(customExtensions, {
				ctx,
				tableName,
				operation: 'patch',
				patchId: id,
				onFail: options?.onFail,
				schema: _schema,
				data: verifiedData,
			})) as typeof verifiedData;
		}

		if (builtins.uniqueRow) {
			verifiedData = await builtins.uniqueRow.verify({
				ctx,
				tableName,
				operation: 'patch',
				patchId: id,
				onFail: options?.onFail,
				schema: _schema,
				data: verifiedData,
			});
		}

		if (builtins.uniqueColumn) {
			verifiedData = await builtins.uniqueColumn.verify({
				ctx,
				tableName,
				operation: 'patch',
				patchId: id,
				onFail: options?.onFail,
				schema: _schema,
				data: verifiedData,
			});
		}

		await ctx.db.patch(id, verifiedData);
	};

	return {
		insert,
		patch,
		dangerouslyPatch,
		verify,
		config,
	};
};
