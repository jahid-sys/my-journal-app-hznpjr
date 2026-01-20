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

import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  mood: text('mood'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
