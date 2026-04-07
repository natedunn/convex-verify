import {
	DataModelFromSchemaDefinition,
	DocumentByName,
	GenericSchema,
	SchemaDefinition,
	TableNamesInDataModel,
	WithoutSystemFields,
} from 'convex/server';
import { ConvexError } from 'convex/values';

import { constructColumnData, constructIndexData } from '../utils/helpers';
import {
	DataModelForSchema,
	DefaultValuesConfigInput,
	DefaultValuesVerifyFn,
	ProtectedColumnsConfigData,
	ProtectedColumnsVerifyFn,
	UniqueColumnConfigData,
	UniqueColumnConfigOptions,
	UniqueVerifyFn,
	UniqueRowConfigData,
	UniqueRowConfigOptions,
	normalizeIndexConfigEntry,
} from './types';

type ProtectedColumnsLike = Record<string, readonly PropertyKey[] | undefined>;

export const stripProtectedPatchColumns = <T extends Record<string, any>>(
	protectedColumns: ProtectedColumnsLike,
	tableName: string,
	data: T,
) => {
	const protectedKeys = protectedColumns[tableName] ?? [];

	if (protectedKeys.length === 0) {
		return {
			filteredData: data,
			removedColumns: [] as string[],
		};
	}

	const protectedKeySet = new Set(protectedKeys.map(String));
	const removedColumns = protectedKeys.filter((key) => key in data).map(String);
	if (removedColumns.length === 0) {
		return {
			filteredData: data,
			removedColumns,
		};
	}

	const filteredData = Object.fromEntries(
			Object.entries(data).filter(([key]) => !protectedKeySet.has(key)),
	) as T;

	return {
		filteredData,
		removedColumns,
	};
};

export const buildDefaultValuesVerifier = <
	S extends SchemaDefinition<GenericSchema, boolean>,
	const C extends DefaultValuesConfigInput<DataModelForSchema<S>>,
>(
	config: C,
) => {
	const verify: DefaultValuesVerifyFn<S, { defaultValues: C }> = (async (...args: any[]) => {
		const input =
			args.length === 2
				? {
						tableName: args[0],
						operation: 'insert' as const,
						data: args[1],
					}
				: args[0];

		if (input.operation === 'patch') {
			return input.data;
		}

		const resolvedConfig = (
			typeof config === 'function' ? await config() : config
		) as Record<string, Record<string, unknown> | undefined>;
		return {
			...(resolvedConfig[input.tableName] ?? {}),
			...input.data,
		};
	}) as DefaultValuesVerifyFn<S, { defaultValues: C }>;

	return {
		_type: 'defaultValues' as const,
		config,
		verify,
	};
};

export const buildProtectedColumnsVerifier = <
	S extends SchemaDefinition<GenericSchema, boolean>,
	const C extends ProtectedColumnsConfigData<DataModelForSchema<S>>,
>(
	config: C,
) => {
	const verify: ProtectedColumnsVerifyFn<S> = (async (...args: any[]) => {
		const input =
			args.length === 2
				? {
						tableName: args[0],
						operation: 'patch' as const,
						data: args[1],
					}
				: args[0];

		if (input.operation === 'insert') {
			return input.data;
		}

		return stripProtectedPatchColumns(config, input.tableName, input.data).filteredData;
	}) as ProtectedColumnsVerifyFn<S>;

	return {
		_type: 'protectedColumns' as const,
		config,
		verify,
	};
};

export const buildUniqueRowVerifier = <
	S extends SchemaDefinition<GenericSchema, boolean>,
	const C extends UniqueRowConfigData<DataModelForSchema<S>>,
>(
	schema: S,
	config: C,
) => {
	type DataModel = DataModelFromSchemaDefinition<S>;

	const uniqueRowError = (message: string): never => {
		throw new ConvexError({
			message,
			code: 'UNIQUE_ROW_VERIFICATION_ERROR',
		});
	};

	const verify: UniqueVerifyFn<S> = (async (...args: any[]) => {
		const input =
			args.length === 3
				? {
						ctx: args[0],
						tableName: args[1],
						operation: 'insert' as const,
						data: args[2],
					}
				: args.length === 4
					? {
							ctx: args[0],
							tableName: args[1],
							operation: 'patch' as const,
							patchId: args[2],
							data: args[3],
						}
					: args[0];

		const { ctx, tableName, operation, patchId, onFail, data } = input;
		const indexesData = constructIndexData<
			S,
			DataModel,
			typeof tableName,
			UniqueRowConfigOptions
		>(schema, tableName, config);

		if (!indexesData) {
			return data;
		}

		for (const indexInfo of indexesData) {
			const { name, fields, identifiers } = indexInfo;

			if (!fields[0] && !fields[1]) {
				uniqueRowError(
					`Error in 'verifyRowUniqueness()'. There must be two columns to test against. If you are attempting to enforce a unique column, use the 'uniqueColumn' config option.`,
				);
			}

			const columnData = constructColumnData(fields, data, {});

			const getExisting = async (cd: ReturnType<typeof constructColumnData>) => {
				type TableDoc = DocumentByName<DataModel, typeof tableName>;
				let existingByIndex: TableDoc[] = [];

				if (cd) {
					existingByIndex = await ctx.db
						.query(tableName)
						.withIndex(name, (q: any) =>
							cd.reduce((query: any, { column, value }) => query.eq(column, value), q),
						)
						.collect();
				}

				if (existingByIndex.length > 1) {
					console.warn(
						`There was more than one existing result found for index ${name}. Check the following IDs:`,
						existingByIndex.map((row) => row._id),
					);
					console.warn(
						'It is recommended that you triage the rows listed above since they have data that go against a rule of row uniqueness.',
					);
				}

				return existingByIndex.length > 0 ? existingByIndex[0] : null;
			};

			const existing = await getExisting(columnData);

			if (operation === 'insert') {
				if (!existing) {
					continue;
				}

				onFail?.({
					uniqueRow: {
						existingData: existing,
					},
				});
				uniqueRowError(
					`Unable to [${operation}] document. In table [${tableName}], there is an existing row that has the same data combination in the columns: [${fields.join(', ')}].`,
				);
			}

			if (!patchId) {
				uniqueRowError('Unable to patch document without an id.');
			}

			type TableDoc = DocumentByName<DataModel, typeof tableName>;

			const matchedToExisting = (_existing: TableDoc | null, _data: Partial<TableDoc>) => {
				let idMatchedToExisting: string | null = null;

				if (_existing) {
					for (const identifier of identifiers) {
						if (
							((_existing[identifier as keyof TableDoc] !== undefined &&
								_data[identifier as keyof TableDoc] !== undefined &&
								_existing[identifier as keyof TableDoc] === _data[identifier as keyof TableDoc]) ||
								(identifier === '_id' &&
									_existing[identifier as keyof TableDoc] === patchId))
						) {
							idMatchedToExisting = String(identifier);
							break;
						}
					}
				}

				return idMatchedToExisting;
			};

			const checkExisting = (_existing: TableDoc | null, _data: Partial<TableDoc>) => {
				const matchedId = matchedToExisting(_existing, _data);

				if (!_existing || matchedId) {
					return;
				}

				onFail?.({
					uniqueRow: {
						existingData: _existing,
					},
				});
				uniqueRowError(
					`In '${tableName}' table, there already exists a value match of the columns: [${fields.join(',')}].`,
				);
			};

			if (!existing && !columnData) {
				const match = await ctx.db.get(patchId);

				if (!match) {
					uniqueRowError(`No document found for id ${patchId}`);
				}

				const extensiveColumnData = constructColumnData(
					fields,
					{
						...match,
						...data,
					},
					{},
				);

				if (!extensiveColumnData) {
					uniqueRowError('Incomplete data when there should have been enough.');
				}

				const extensiveExisting = await getExisting(extensiveColumnData);
				checkExisting(extensiveExisting as TableDoc | null, data as Partial<TableDoc>);
				continue;
			}

			checkExisting(existing as TableDoc | null, data as Partial<TableDoc>);
		}

		return data;
	}) as UniqueVerifyFn<S>;

	return {
		_type: 'uniqueRow' as const,
		config,
		verify,
	};
};

export const buildUniqueColumnVerifier = <
	S extends SchemaDefinition<GenericSchema, boolean>,
	const C extends UniqueColumnConfigData<DataModelForSchema<S>>,
>(
	config: C,
) => {
	const uniqueColumnError = (message: string): never => {
		throw new ConvexError({
			message,
			code: 'UNIQUE_COLUMN_VERIFICATION_ERROR',
		});
	};

	const verify: UniqueVerifyFn<S> = (async (...args: any[]) => {
		const input =
			args.length === 3
				? {
						ctx: args[0],
						tableName: args[1],
						operation: 'insert' as const,
						data: args[2],
					}
				: args.length === 4
					? {
							ctx: args[0],
							tableName: args[1],
							operation: 'patch' as const,
							patchId: args[2],
							data: args[3],
						}
					: args[0];

		const { ctx, tableName, patchId, onFail, data } = input;
		const tableConfig = config[tableName as keyof typeof config] as
			| (string | { index: string; identifiers?: string[] })[]
			| undefined;

		if (!tableConfig) {
			return data;
		}

		for (const entry of tableConfig) {
			const { index, identifiers } = normalizeIndexConfigEntry<UniqueColumnConfigOptions>(
				entry as any,
			);
			const columnName = index.replace('by_', '');
			const value = data[columnName];

			if (value === undefined || value === null) {
				continue;
			}

			const existing = await ctx.db
				.query(tableName)
				.withIndex(index, (q: any) => q.eq(columnName, value))
				.unique();

			if (!existing) {
				continue;
			}

			let isOwnDocument = false;

			for (const identifier of identifiers) {
				if (identifier === '_id' && patchId && existing._id === patchId) {
					isOwnDocument = true;
					break;
				}

				if (
					existing[identifier] !== undefined &&
					data[identifier] !== undefined &&
					existing[identifier] === data[identifier]
				) {
					isOwnDocument = true;
					break;
				}
			}

			if (isOwnDocument) {
				continue;
			}

			onFail?.({
				uniqueColumn: {
					conflictingColumn: columnName,
					existingData: existing,
				},
			});
			uniqueColumnError(
				`In [${tableName}] table, there already exists value "${value}" in column [${columnName}].`,
			);
		}

		return data;
	}) as UniqueVerifyFn<S>;

	return {
		_type: 'uniqueColumn' as const,
		config,
		verify,
	};
};
