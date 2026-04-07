import {
	DataModelFromSchemaDefinition,
	DocumentByName,
	GenericSchema,
	SchemaDefinition,
	TableNamesInDataModel,
	WithoutSystemFields,
} from "convex/server";

import { DefaultValuesConfigData, MakeOptional } from "../core/types";

export const defaultValuesConfig = <
	S extends SchemaDefinition<GenericSchema, boolean>,
	DataModel extends DataModelFromSchemaDefinition<S>,
	const C extends DefaultValuesConfigData<DataModel>,
>(
	_schema: S,
	config: C | (() => C | Promise<C>),
) => {
	const verify = async <TN extends TableNamesInDataModel<DataModel>>(
		tableName: TN,
		data: MakeOptional<
			WithoutSystemFields<DocumentByName<DataModel, TN>>,
			keyof C[TN]
		>,
	): Promise<WithoutSystemFields<DocumentByName<DataModel, TN>>> => {
		const resolvedConfig =
			typeof config === "function" ? await config() : config;

		return {
			...(resolvedConfig[tableName] as Partial<
				WithoutSystemFields<DocumentByName<DataModel, TN>>
			>),
			...(data as WithoutSystemFields<DocumentByName<DataModel, TN>>),
		};
	};

	return {
		_type: "defaultValues" as const,
		verify,
		config,
	};
};

