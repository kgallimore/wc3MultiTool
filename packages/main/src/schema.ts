import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const banList = sqliteTable('BanList', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').notNull().references(() => userList.name, { onDelete: 'restrict', onUpdate: 'cascade' } ),
	admin: text('admin').notNull(),
	region: text('region').notNull(),
	reason: text('reason'),
	removalDate: integer('removal_date', { mode: 'timestamp' }),
	createdAt: integer('createdAt', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`).$onUpdate(() => new Date()),
});

export const whiteList = sqliteTable('WhiteList', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').notNull().references(() => userList.name, { onDelete: 'restrict', onUpdate: 'cascade' } ),
	admin: text('admin').notNull(),
	region: text('region').notNull(),
	reason: text('reason'),
	removalDate: integer('removal_date', { mode: 'timestamp' }),
	createdAt: integer('createdAt', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`).$onUpdate(() => new Date()),
});

export const adminList = sqliteTable('AdminList', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').notNull().references(() => userList.name, { onDelete: 'restrict', onUpdate: 'cascade' } ),
	admin: text('admin').notNull(),
	region: text('region').notNull(),
	role: text('role').notNull(),
	removalDate: integer('removal_date', { mode: 'timestamp' }),
	createdAt: integer('createdAt', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`).$onUpdate(() => new Date()),
});

export const userList = sqliteTable('UserList', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	createdAt: integer('createdAt', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`).$onUpdate(() => new Date()),
},
(table) => {
	return {
		nameKey: uniqueIndex('UserList_name_key').on(table.name),
	};
});

export const userStats = sqliteTable('UserStats', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').notNull().references(() => userList.name, { onDelete: 'restrict', onUpdate: 'cascade' } ),
	gameName: text('gameName').notNull(),
	mapName: text('mapName').notNull(),
	gamesPlayed: integer('gamesPlayed').default(0).notNull(),
});

export const logs = sqliteTable('Logs', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	source: text('source').notNull(),
	message: text('message').notNull(),
	priority: text('priority', {enum: ['error', 'warn', 'verbose', 'info']}).default('verbose').notNull(),
	createdAt: integer('createdAt', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`).$onUpdate(() => new Date()),
});

export const settings = sqliteTable('Settings', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	type: text('type').notNull(),
	category: text('category').notNull(),
	key: text('key').notNull(),
	value: text('value').notNull(),
	sensitive: integer('sensitive', { mode: 'boolean' }).$default(()=>false).notNull(),
	createdAt: integer('createdAt', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).default(sql`(CURRENT_TIMESTAMP)`).$onUpdate(() => new Date()),
});