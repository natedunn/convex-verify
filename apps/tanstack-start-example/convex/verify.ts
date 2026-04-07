import { createExtension, verifyConfig } from "convex-verify";
import schema from "./schema";

const normalizeText = (value: string) => value.trim().toLowerCase();

export const normalizeEmail = createExtension(schema, (input) => {
	// Type narrowing to uniqueEmailUsers table
	if (input.tableName === "uniqueEmailUsers") {
		// Type narrowing to patch operation
		if (input.operation === "patch") {
			return {
				...input.data,
				...(input.data.email !== undefined && {
					email: normalizeText(input.data.email),
				}),
			};
		}

		// Type narrowed to insert operation
		return {
			...input.data,
			email: normalizeText(input.data.email),
		};
	}
	return input.data;
});

export const normalizeSlugs = createExtension(schema, (input) => {
	if (input.tableName === "uniquePairEntries") {
		if (input.operation === "patch") {
			return {
				...input.data,
				...(input.data.slug !== undefined && {
					slug: normalizeText(input.data.slug),
				}),
				...(input.data.teamSlug !== undefined && {
					teamSlug: normalizeText(input.data.teamSlug),
				}),
			};
		}

		return {
			...input.data,
			slug: normalizeText(input.data.slug),
			teamSlug: normalizeText(input.data.teamSlug),
		};
	}

	return input.data;
});

export const { insert, patch, dangerouslyPatch, verify } = verifyConfig(
	schema,
	{
		extensions: [normalizeEmail, normalizeSlugs],
		defaultValues: () => ({
			users: {
				createdAt: Date.now(),
				status: "pending",
			},
			defaultProfiles: {
				createdAt: Date.now(),
				status: "pending",
			},
		}),
		protectedColumns: {
			protectedDocs: ["ownerId"],
		},
		uniqueColumn: {
			users: ["by_email"],
			uniqueEmailUsers: ["by_email"],
		},
		uniqueRow: {
			uniquePairEntries: ["by_team_slug"],
		},
	},
);
