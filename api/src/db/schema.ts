import { pgTable, uuid, text, timestamp, jsonb, boolean, integer, unique, doublePrecision } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(), // 添加密码字段
  role: text('role').notNull().default('member'), // owner, admin, member
  avatar: text('avatar'), // base64 avatar
  balance: integer('balance').notNull().default(100000), // 用户余额，单位 token
  createdAt: timestamp('created_at').defaultNow(),
});

export const userGroups = pgTable('user_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userGroupMembers = pgTable('user_group_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  groupId: uuid('group_id').references(() => userGroups.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  uniqueUserGroup: unique().on(t.userId, t.groupId),
}));

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
  visibility: text('visibility').notNull().default('public'), // 'public', 'selected_groups', 'private'
  categoryId: uuid('category_id').references(() => categories.id),
  multiplier: doublePrecision('multiplier').notNull().default(1.0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const agentUserGroups = pgTable('agent_user_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  groupId: uuid('group_id').references(() => userGroups.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  uniqueAgentGroup: unique().on(t.agentId, t.groupId),
}));

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
  multiplier: doublePrecision('multiplier').notNull().default(1.0),
  visibility: text('visibility').notNull().default('public'), // 'public', 'selected_groups'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const modelUserGroups = pgTable('model_user_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  modelId: uuid('model_id').references(() => models.id, { onDelete: 'cascade' }).notNull(),
  groupId: uuid('group_id').references(() => userGroups.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  uniqueModelGroup: unique().on(t.modelId, t.groupId),
}));

export const userUsage = pgTable('user_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  source: text('source').notNull(), // 'super_agent' or agentId
  
  // Usage fields
  promptTokens: integer('prompt_tokens'),
  promptUnitPrice: text('prompt_unit_price'),
  promptPriceUnit: text('prompt_price_unit'),
  promptPrice: text('prompt_price'),
  
  completionTokens: integer('completion_tokens'),
  completionUnitPrice: text('completion_unit_price'),
  completionPriceUnit: text('completion_price_unit'),
  completionPrice: text('completion_price'),
  
  totalTokens: integer('total_tokens'),
  totalPrice: text('total_price'),
  currency: text('currency'),
  
  multiplier: doublePrecision('multiplier').notNull().default(1.0),

  latency: text('latency'),
  timeToFirstToken: text('time_to_first_token'),
  timeToGenerate: text('time_to_generate'),
  
  createdAt: timestamp('created_at').defaultNow(),
});
