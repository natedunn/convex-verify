import { describe, expect, it } from 'vitest';
import { GenericId } from 'convex/values';

import schema from '../__tests__/schema';
import { MutationCtxForSchema } from './types';
import { verifyConfig } from './verifyConfig';

function assertInlineVerifyConfigTypes(
	ctx: MutationCtxForSchema<typeof schema>,
	postId: GenericId<'posts'>,
) {
	const full = verifyConfig(schema, {
		defaultValues: {
			posts: { status: 'draft', views: 0 },
		},
		protectedColumns: {
			posts: ['authorId'],
		},
		uniqueRow: {
			posts: ['by_author_slug'],
		},
		uniqueColumn: {
			users: ['by_email'],
		},
	});

	void full.insert(ctx, 'posts', {
		title: 'hello',
		slug: 'hello',
		authorId: 'author-1',
	});

	void full.patch(ctx, 'posts', postId, {
		// @ts-expect-error protected columns are removed from patch input
		authorId: 'author-2',
	});

	void full.dangerouslyPatch(ctx, 'posts', postId, {
		authorId: 'author-2',
	});

	void full.verify.defaultValues({
		ctx,
		tableName: 'posts',
		operation: 'insert',
		schema,
		data: {
			title: 'hello',
			slug: 'hello',
			authorId: 'author-1',
		},
	});

	void full.verify.defaultValues('posts', {
		title: 'hello',
		slug: 'hello',
		authorId: 'author-1',
	});

	void full.verify.protectedColumns({
		ctx,
		tableName: 'posts',
		operation: 'patch',
		patchId: postId,
		schema,
		data: {
			authorId: 'author-2',
		},
	});

	void full.verify.protectedColumns('posts', {
		authorId: 'author-2',
	});

	void full.verify.uniqueRow({
		ctx,
		tableName: 'posts',
		operation: 'insert',
		schema,
		data: {
			title: 'hello',
			slug: 'hello',
			authorId: 'author-1',
		},
	});

	void full.verify.uniqueRow(ctx, 'posts', {
		title: 'hello',
		slug: 'hello',
		authorId: 'author-1',
	});

	void full.verify.uniqueRow({
		ctx,
		tableName: 'posts',
		operation: 'patch',
		patchId: postId,
		schema,
		data: {
			slug: 'updated',
		},
	});

	void full.verify.uniqueRow(ctx, 'posts', postId, {
		slug: 'updated',
	});

	void full.verify.uniqueColumn(ctx, 'users', {
		email: 'alice@example.com',
	});

	void full.verify.uniqueColumn(ctx, 'users', 'user-id' as GenericId<'users'>, {
		username: 'alice',
	});

	void full.verify.uniqueRow(ctx, 'posts', {
		slug: 'hello',
	});

	void full.config.uniqueRow.posts;

	// @ts-expect-error config entries are passive data only
	void full.config.uniqueRow.verify;

	void verifyConfig(schema, {
		// @ts-expect-error invalid table name
		defaultValues: {
			nope: { status: 'draft' },
		},
	});

	void verifyConfig(schema, {
		// @ts-expect-error invalid table name in function return
		defaultValues: () => ({
			nope: { status: 'draft' },
		}),
	});

	void verifyConfig(schema, {
		// @ts-expect-error invalid default column
		defaultValues: {
			posts: {
				nope: 'draft',
			},
		},
	});

	void full.verify.defaultValues('posts', {
		// @ts-expect-error invalid insert field for posts
		email: 'alice@example.com',
	});

	void verifyConfig(schema, {
		protectedColumns: {
			posts: [
				// @ts-expect-error invalid protected column
				'nope',
			],
		},
	});

	void verifyConfig(schema, {
		uniqueRow: {
			posts: [
				// @ts-expect-error invalid uniqueRow index
				'by_missing',
			],
		},
	});

	void verifyConfig(schema, {
		uniqueColumn: {
			users: [
				// @ts-expect-error invalid uniqueColumn index
				'by_missing',
			],
		},
	});

	void verifyConfig(schema, {
		uniqueColumn: {
			// @ts-expect-error invalid table on uniqueColumn
			blah: ['fake'],
		},
	});

	void full.verify.uniqueRow({
		ctx,
		tableName: 'posts',
		operation: 'patch',
		patchId: postId,
		schema,
		data: {
			// @ts-expect-error wrong patch field for posts
			email: 'alice@example.com',
		},
	});

	void full.verify.uniqueRow(ctx, 'posts', {
		// @ts-expect-error wrong insert field for posts
		email: 'alice@example.com',
	});

	void full.verify.protectedColumns('posts', {
		// @ts-expect-error wrong patch field for posts
		email: 'alice@example.com',
	});

	const uniquenessOnly = verifyConfig(schema, {
		uniqueRow: {
			posts: ['by_author_slug'],
		},
	});

	void uniquenessOnly.verify.uniqueRow({
		ctx,
		tableName: 'posts',
		operation: 'insert',
		schema,
		data: {
			title: 'hello',
			slug: 'hello',
			authorId: 'author-1',
		},
	});

	// @ts-expect-error defaultValues was not configured
	void uniquenessOnly.verify.defaultValues;

	// @ts-expect-error defaultValues was not configured
	void uniquenessOnly.config.defaultValues;
}

void assertInlineVerifyConfigTypes;

describe('verifyConfig compile-time assertions', () => {
	it('keeps the type assertions file in the runtime suite', () => {
		expect(true).toBe(true);
	});
});
