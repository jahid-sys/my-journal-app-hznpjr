/**
 * Define your database schema here using Drizzle ORM
 *
 * Example:
 * import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
 *
 * export const users = pgTable('users', {
 *   id: uuid('id').primaryKey().defaultRandom(),
 *   name: text('name').notNull(),
 *   createdAt: timestamp('created_at').notNull().defaultNow(),
 * });
 */

import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  mood: text('mood'),
  type: text('type').notNull().default('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('journal_entries_user_id_idx').on(table.userId),
}));
