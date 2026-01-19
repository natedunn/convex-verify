import { describe, it, expect } from "vitest";
import { normalizeIndexConfigEntry } from "./types";

describe("normalizeIndexConfigEntry", () => {
	it("normalizes string shorthand to object with default identifiers", () => {
		const result = normalizeIndexConfigEntry("by_email");
		expect(result).toEqual({
			index: "by_email",
			identifiers: ["_id"],
		});
	});

	it("normalizes object config preserving custom identifiers", () => {
		const result = normalizeIndexConfigEntry({
			index: "by_email",
			identifiers: ["_id", "clerkId"],
		});
		expect(result).toEqual({
			index: "by_email",
			identifiers: ["_id", "clerkId"],
		});
	});

	it("uses custom default identifiers when provided", () => {
		const result = normalizeIndexConfigEntry("by_email", ["_id", "userId"]);
		expect(result).toEqual({
			index: "by_email",
			identifiers: ["_id", "userId"],
		});
	});

	it("handles object config without identifiers using defaults", () => {
		const result = normalizeIndexConfigEntry({ index: "by_username" });
		expect(result).toEqual({
			index: "by_username",
			identifiers: ["_id"],
		});
	});

	it("preserves additional options from object config", () => {
		const result = normalizeIndexConfigEntry({
			index: "by_author_slug",
			identifiers: ["_id"],
			queryExistingWithNullish: true,
		});
		expect(result).toEqual({
			index: "by_author_slug",
			identifiers: ["_id"],
			queryExistingWithNullish: true,
		});
	});
});
