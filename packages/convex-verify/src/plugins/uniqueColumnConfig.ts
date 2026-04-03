import { DataModelFromSchemaDefinition, GenericSchema, SchemaDefinition } from 'convex/server';
import { ConvexError } from 'convex/values';

import { ExtensionContext, SchemaExtension } from '../core/plugin';
import {
	normalizeIndexConfigEntry,
	UniqueColumnConfigData,
	UniqueColumnConfigOptions,
} from '../core/types';

/**
 * Creates an extension that enforces column uniqueness using single-column indexes.
 *
 * This is useful when you have a column that must be unique across all rows,
 * like usernames or email addresses.
 *
 * The column name is derived from the index name by removing the 'by_' prefix.
 * For example, 'by_username' checks the 'username' column.
 *
 * @param schema - Your Convex schema definition
 * @param config - Object mapping table names to arrays of index configs
 * @returns An extension for use with verifyConfig
 *
 * @example
 * ```ts
 * // Shorthand: just pass index names as strings
 * const uniqueColumn = uniqueColumnConfig(schema, {
 *   users: ['by_username', 'by_email'],
 *   organizations: ['by_slug'],
 * });
 *
 * // Full config: pass objects with options
 * const uniqueColumn = uniqueColumnConfig(schema, {
 *   users: [
 *     { index: 'by_username', identifiers: ['_id', 'userId'] },
 *     { index: 'by_email', identifiers: ['_id'] },
 *   ],
 * });
 *
 * // Mix and match
 * const uniqueColumn = uniqueColumnConfig(schema, {
 *   users: [
 *     'by_username',  // shorthand
 *     { index: 'by_email', identifiers: ['_id', 'clerkId'] },  // full config
 *   ],
 * });
 *
 * // Use with verifyConfig
 * const { insert, patch } = verifyConfig(schema, {
 *   extensions: [uniqueColumn],
 * });
 * ```
 */
export const uniqueColumnConfig = <
	S extends SchemaDefinition<GenericSchema, boolean>,
	DataModel extends DataModelFromSchemaDefinition<S>,
	const C extends UniqueColumnConfigData<DataModel>,
>(
	_schema: S,
	config: C
): SchemaExtension<S, 'uniqueColumn', C> => {
	const uniqueColumnError = (message: string): never => {
		throw new ConvexError({
			message,
			code: 'UNIQUE_COLUMN_VERIFICATION_ERROR',
		});
	};

	/**
	 * Core verification logic shared between insert and patch
	 */
	const verifyUniqueness = async <TN extends string, D extends Record<string, any>>(
		context: ExtensionContext<TN>,
		data: D
	): Promise<D> => {
		const { ctx, tableName, patchId, onFail } = context;

		const tableConfig = config[tableName as keyof typeof config] as
			| (string | { index: string; identifiers?: string[] })[]
			| undefined;

		// No config for this table
		if (!tableConfig) {
			return data;
		}

		for (const entry of tableConfig) {
			const { index, identifiers } = normalizeIndexConfigEntry<UniqueColumnConfigOptions>(
				entry as any
			);

			// Extract column name from index name (e.g., 'by_username' -> 'username')
			const columnName = index.replace('by_', '');
			const value = data[columnName];

			// Skip if the column isn't in the data being inserted/patched
			if (value === undefined || value === null) {
				continue;
			}

			// Query for existing row with this value
			const existing = await ctx.db
				.query(tableName)
				.withIndex(index, (q: any) => q.eq(columnName, value))
				.unique();

			if (!existing) {
				// No conflict, continue to next index
				continue;
			}

			// Check if the existing row matches one of the identifiers
			// (meaning we're updating the same document, not creating a conflict)
			let isOwnDocument = false;

			for (const identifier of identifiers) {
				// For patch operations, also check against patchId when identifier is '_id'
				if (identifier === '_id' && patchId && existing._id === patchId) {
					isOwnDocument = true;
					break;
				}

				// Check if both existing and data have the same identifier value
				const existingValue = existing[identifier];
				const incomingValue = data[identifier];

				if (
					existingValue !== undefined &&
					incomingValue !== undefined &&
					existingValue === incomingValue
				) {
					isOwnDocument = true;
					break;
				}
			}

			if (isOwnDocument) {
				// Same document, no conflict
				continue;
			}

			// Different document has this value - fail
			onFail?.({
				uniqueColumn: {
					conflictingColumn: columnName,
					existingData: existing,
				},
			});

			uniqueColumnError(
				`In [${tableName}] table, there already exists value "${value}" in column [${columnName}].`
			);
		}

		return data;
	};

	const extension = {
		_type: 'uniqueColumn',
		config,
		async verify(input) {
			return (await verifyUniqueness(
				input as unknown as ExtensionContext<typeof input.tableName>,
				input.data as Record<string, any>
			)) as typeof input.data;
		},
	} as SchemaExtension<S, 'uniqueColumn', C>;

	return extension;
};
