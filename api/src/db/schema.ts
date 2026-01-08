import { pgTable, uuid, text, timestamp, jsonb, boolean, integer, unique } from 'drizzle-orm/pg-core';

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
  sort: integer('sort').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const agents = pgTable('agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  apiKey: text('api_key').notNull(),
  baseUrl: text('base_url'),
  iconUrl: text('icon_url'),
  isPublic: boolean('is_public').notNull().default(false),
  categoryId: uuid('category_id').references(() => categories.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userFavoriteAgents = pgTable('user_favorite_agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  agentId: uuid('agent_id').references(() => agents.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  uniqueUserAgent: unique().on(t.userId, t.agentId),
}));

export const models = pgTable('models', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  modelId: text('model_id').notNull().unique(), // 实际调用大模型时的模型 ID
  sort: integer('sort').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  iconUrl: text('icon_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
