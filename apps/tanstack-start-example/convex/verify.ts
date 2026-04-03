import {
	createExtension,
	defaultValuesConfig,
	uniqueColumnConfig,
	verifyConfig,
} from "convex-verify";
import schema from "./schema";

export const normalizeEmail = createExtension<typeof schema>((input) => {
	if (input.tableName === "users") {
		if (input.operation === "patch") {
			return {
				...input.data,
				...(input.data.email !== undefined && {
					email: input.data.email.toLowerCase().trim(),
				}),
			};
		}

		return {
			...input.data,
			email: input.data.email.toLowerCase().trim(),
		};
	}
	return input.data;
});

export const { insert } = verifyConfig(schema, {
	extensions: [normalizeEmail],
	defaultValues: defaultValuesConfig(schema, () => ({
		users: {
			createdAt: Date.now(),
			status: "pending",
		},
	})),
	uniqueColumn: uniqueColumnConfig(schema, {
		users: ["by_email"],
	}),
});
