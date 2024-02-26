import { sqliteTable, text, numeric, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
  import { sql } from 'drizzle-orm';

export const banList = sqliteTable('BanList', {
	id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
	username: text('username').notNull().references(() => userList.name, { onDelete: 'restrict', onUpdate: 'cascade' } ),
	admin: text('admin').notNull(),
	region: text('region').notNull(),
	reason: text('reason'),
	removalDate: numeric('removal_date'),
	createdAt: numeric('createdAt').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: numeric('updatedAt').default(sql`(CURRENT_TIMESTAMP)`),
});

export const whiteList = sqliteTable('WhiteList', {
	id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
	username: text('username').notNull().references(() => userList.name, { onDelete: 'restrict', onUpdate: 'cascade' } ),
	admin: text('admin').notNull(),
	region: text('region').notNull(),
	reason: text('reason'),
	removalDate: numeric('removal_date'),
	createdAt: numeric('createdAt').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: numeric('updatedAt').default(sql`(CURRENT_TIMESTAMP)`),
});

export const adminList = sqliteTable('AdminList', {
	id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
	username: text('username').notNull().references(() => userList.name, { onDelete: 'restrict', onUpdate: 'cascade' } ),
	admin: text('admin').notNull(),
	region: text('region').notNull(),
	role: text('role').notNull(),
	removalDate: numeric('removal_date'),
	createdAt: numeric('createdAt').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: numeric('updatedAt').default(sql`(CURRENT_TIMESTAMP)`),
});

export const userList = sqliteTable('UserList', {
	id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
	name: text('name').notNull(),
	createdAt: numeric('createdAt').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: numeric('updatedAt').default(sql`(CURRENT_TIMESTAMP)`),
},
(table) => {
	return {
		nameKey: uniqueIndex('UserList_name_key').on(table.name),
	};
});

export const userStats = sqliteTable('UserStats', {
	id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
	username: text('username').notNull().references(() => userList.name, { onDelete: 'restrict', onUpdate: 'cascade' } ),
	gameName: text('gameName').notNull(),
	mapName: text('mapName').notNull(),
	gamesPlayed: integer('gamesPlayed').default(0).notNull(),
});

export const logs = sqliteTable('Logs', {
	id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
	source: text('source').notNull(),
	message: text('message').notNull(),
	priority: text('priority', {enum: ['error', 'warn', 'verbose', 'info']}).default('verbose').notNull(),
	createdAt: numeric('createdAt').default(sql`(CURRENT_TIMESTAMP)`),
	updatedAt: numeric('updatedAt').default(sql`(CURRENT_TIMESTAMP)`),
});