import { pgTable, uuid, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(), // 添加密码字段
  role: text('role').notNull().default('member'), // owner, admin, member
  createdAt: timestamp('created_at').defaultNow(),
});

export const datasets = pgTable('datasets', {
  id: uuid('id').defaultRandom().primaryKey(),
  difyId: text('dify_id').notNull(), // Dify 返回的 dataset id
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const agents = pgTable('agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  apiKey: text('api_key').notNull(),
  iconUrl: text('icon_url'),
  isPublic: boolean('is_public').notNull().default(false),
  categoryId: uuid('category_id').references(() => categories.id),
  createdAt: timestamp('created_at').defaultNow(),
});
