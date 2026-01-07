import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

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
