import { pgTable, uuid, text, timestamp, jsonb, boolean, integer, unique, doublePrecision, pgEnum, decimal, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('role', ['owner', 'admin', 'member']);
export const visibilityEnum = pgEnum('visibility', ['public', 'selected_groups', 'private']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(), // 添加密码字段
  role: roleEnum('role').notNull().default('member'), // owner, admin, member
  avatar: text('avatar'), // avatar url (MinIO)
  balance: decimal('balance', { precision: 18, scale: 2 }).notNull().default('100'), // 用户余额，单位 点数
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

export const userGroups = pgTable('user_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

export const userGroupMembers = pgTable('user_group_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  groupId: uuid('group_id').references(() => userGroups.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  uniqueUserGroup: unique().on(t.userId, t.groupId),
  userIdIdx: index('user_group_members_user_id_idx').on(t.userId),
  groupIdIdx: index('user_group_members_group_id_idx').on(t.groupId),
}));

export const datasets = pgTable('datasets', {
  id: uuid('id').defaultRandom().primaryKey(),
  difyId: text('dify_id').notNull(), // Dify 返回的 dataset id
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  difyIdIdx: index('datasets_dify_id_idx').on(t.difyId),
  userIdIdx: index('datasets_user_id_idx').on(t.userId),
}));

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  datasetId: uuid('dataset_id').references(() => datasets.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(), // 冗余一下方便鉴权和OSS路径构建
  name: text('name').notNull(),
  size: integer('size').notNull(), // 字节数
  url: text('url').notNull(), // MinIO path/url
  mimeType: text('mime_type'),
  extension: text('extension'),
  difyId: text('dify_id'), // Dify 文档 ID
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  datasetIdIdx: index('documents_dataset_id_idx').on(t.datasetId),
  userIdIdx: index('documents_user_id_idx').on(t.userId),
}));

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  sort: integer('sort').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

export const agents = pgTable('agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  apiKey: text('api_key').notNull(),
  baseUrl: text('base_url'),
  iconUrl: text('icon_url'),
  visibility: visibilityEnum('visibility').notNull().default('public'), // 'public', 'selected_groups', 'private'
  categoryId: uuid('category_id').references(() => categories.id),
  multiplier: doublePrecision('multiplier').notNull().default(1.0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  userIdIdx: index('agents_user_id_idx').on(t.userId),
  categoryIdIdx: index('agents_category_id_idx').on(t.categoryId),
}));

export const agentUserGroups = pgTable('agent_user_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  groupId: uuid('group_id').references(() => userGroups.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  uniqueAgentGroup: unique().on(t.agentId, t.groupId),
  agentIdIdx: index('agent_user_groups_agent_id_idx').on(t.agentId),
  groupIdIdx: index('agent_user_groups_group_id_idx').on(t.groupId),
}));

export const userFavoriteAgents = pgTable('user_favorite_agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  uniqueUserAgent: unique().on(t.userId, t.agentId),
  userIdIdx: index('user_favorite_agents_user_id_idx').on(t.userId),
  agentIdIdx: index('user_favorite_agents_agent_id_idx').on(t.agentId),
}));

export const models = pgTable('models', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  modelId: text('model_id').notNull().unique(), // 实际调用大模型时的模型 ID
  sort: integer('sort').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
  iconUrl: text('icon_url'), // icon url (MinIO)
  multiplier: doublePrecision('multiplier').notNull().default(1.0),
  visibility: visibilityEnum('visibility').notNull().default('public'), // 'public', 'selected_groups'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

export const modelUserGroups = pgTable('model_user_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  modelId: uuid('model_id').references(() => models.id, { onDelete: 'cascade' }).notNull(),
  groupId: uuid('group_id').references(() => userGroups.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  uniqueModelGroup: unique().on(t.modelId, t.groupId),
  modelIdIdx: index('model_user_groups_model_id_idx').on(t.modelId),
  groupIdIdx: index('model_user_groups_group_id_idx').on(t.groupId),
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
  calculatedPoints: decimal('calculated_points', { precision: 18, scale: 2 }), // 结算点数
  latency: text('latency'),
  timeToFirstToken: text('time_to_first_token'),
  timeToGenerate: text('time_to_generate'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  userIdIdx: index('user_usage_user_id_idx').on(t.userId),
  createdAtIdx: index('user_usage_created_at_idx').on(t.createdAt),
}));

export const userEvents = pgTable('user_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventName: text('event_name').notNull(),
  userId: uuid('user_id').references(() => users.id), // 可为空
  extraData: jsonb('extra_data'), // 可为空，上报时附带的额外数据
  url: text('url'), // 当前上报时用户页面的url
  ip: text('ip'), // 来源 IP
  userAgent: text('user_agent'), // 用户代理
  browser: text('browser'), // 浏览器 name:version
  os: text('os'), // 操作系统 os:version
  device: text('device'), // 设备 vendor:model
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  userIdIdx: index('user_events_user_id_idx').on(t.userId),
}));

// Relations

export const usersRelations = relations(users, ({ many }) => ({
  groups: many(userGroupMembers),
  datasets: many(datasets),
  createdAgents: many(agents),
  favoriteAgents: many(userFavoriteAgents),
  usage: many(userUsage),
  events: many(userEvents),
}));

export const userGroupMembersRelations = relations(userGroupMembers, ({ one }) => ({
  user: one(users, {
    fields: [userGroupMembers.userId],
    references: [users.id],
  }),
  group: one(userGroups, {
    fields: [userGroupMembers.groupId],
    references: [userGroups.id],
  }),
}));

export const datasetsRelations = relations(datasets, ({ one }) => ({
  user: one(users, {
    fields: [datasets.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  agents: many(agents),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  user: one(users, {
    fields: [agents.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [agents.categoryId],
    references: [categories.id],
  }),
  groups: many(agentUserGroups),
  favoriteByUsers: many(userFavoriteAgents),
}));

export const agentUserGroupsRelations = relations(agentUserGroups, ({ one }) => ({
  agent: one(agents, {
    fields: [agentUserGroups.agentId],
    references: [agents.id],
  }),
  group: one(userGroups, {
    fields: [agentUserGroups.groupId],
    references: [userGroups.id],
  }),
}));

export const userFavoriteAgentsRelations = relations(userFavoriteAgents, ({ one }) => ({
  user: one(users, {
    fields: [userFavoriteAgents.userId],
    references: [users.id],
  }),
  agent: one(agents, {
    fields: [userFavoriteAgents.agentId],
    references: [agents.id],
  }),
}));

export const modelsRelations = relations(models, ({ many }) => ({
  groups: many(modelUserGroups),
}));

export const modelUserGroupsRelations = relations(modelUserGroups, ({ one }) => ({
  model: one(models, {
    fields: [modelUserGroups.modelId],
    references: [models.id],
  }),
  group: one(userGroups, {
    fields: [modelUserGroups.groupId],
    references: [userGroups.id],
  }),
}));

export const userGroupsRelations = relations(userGroups, ({ many }) => ({
  members: many(userGroupMembers),
  agents: many(agentUserGroups),
  models: many(modelUserGroups),
}));

export const userUsageRelations = relations(userUsage, ({ one }) => ({
  user: one(users, {
    fields: [userUsage.userId],
    references: [users.id],
  }),
}));

export const userEventsRelations = relations(userEvents, ({ one }) => ({
  user: one(users, {
    fields: [userEvents.userId],
    references: [users.id],
  }),
}));
