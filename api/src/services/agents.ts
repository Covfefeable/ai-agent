import axios from 'axios';
import { db } from '../db';
import { agents, categories, users, agentUserGroups, userGroupMembers } from '../db/schema';
import { eq, desc, ilike, or, and, sql, inArray } from 'drizzle-orm';
import { createUsageLogStream } from '../lib/usage';

async function fetchImageAsBase64(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
    const buffer = Buffer.from(response.data);
    const mimeType = response.headers['content-type'] || 'image/png';
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error(`Failed to fetch icon image from ${url}:`, error);
    return null;
  }
}

export const agentService = {
  async verifyAccess(agent: any, userId: string | undefined, userRole: string | undefined) {
    if (!userId || !userRole) return false;
    if (['owner', 'admin'].includes(userRole)) return true;
    if (agent.userId === userId) return true;
    if (agent.visibility === 'public') return true;

    if (agent.visibility === 'selected_groups') {
      // Check if groups are already loaded (from db.query)
      if (agent.groups && Array.isArray(agent.groups)) {
         const groupIds = agent.groups.map((g: any) => g.groupId);
         if (groupIds.length === 0) return false;
         
         const [member] = await db.select({ id: userGroupMembers.id })
           .from(userGroupMembers)
           .where(and(
              eq(userGroupMembers.userId, userId),
              inArray(userGroupMembers.groupId, groupIds)
           ))
           .limit(1);
         return !!member;
      }

      const [match] = await db.select({ id: agentUserGroups.id })
        .from(agentUserGroups)
        .innerJoin(userGroupMembers, eq(agentUserGroups.groupId, userGroupMembers.groupId))
        .where(and(
          eq(agentUserGroups.agentId, agent.id),
          eq(userGroupMembers.userId, userId)
        ))
        .limit(1);
      return !!match;
    }
    
    return false;
  },

  async list(params: { 
    userId: string; 
    userRole: string; 
    keyword?: string; 
    page?: number; 
    limit?: number 
  }) {
    const { userId, userRole, keyword, page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    const conditions = [];

    // Access control: Admin/Owner see all, others see own
    if (!['owner', 'admin'].includes(userRole)) {
      conditions.push(eq(agents.userId, userId));
    }

    if (keyword) {
      const k = `%${keyword}%`;
      conditions.push(or(ilike(agents.title, k), ilike(agents.description, k)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agents)
      .where(whereClause);
    const total = Number(countResult?.count || 0);

    // Get paginated data
    const list = await db.query.agents.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: desc(agents.createdAt),
      with: {
        groups: {
          with: {
            group: true
          }
        }
      }
    });

    const listWithGroups = list.map(item => ({
      ...item,
      groups: item.groups?.map((g: any) => g.group.name).join(',') || undefined
    }));

    return { 
      data: listWithGroups,
      total,
      page,
      limit
    };
  },

  async listPublic(params: {
    userId: string;
    userRole: string;
    keyword?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, userRole, keyword, categoryId, page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    const conditions = [];

    // Access control: Admin/Owner see all, others see public OR own OR visible via group
    if (!['owner', 'admin'].includes(userRole)) {
      const userGroupsSubquery = db
        .select({ id: agentUserGroups.agentId })
        .from(agentUserGroups)
        .innerJoin(userGroupMembers, eq(agentUserGroups.groupId, userGroupMembers.groupId))
        .where(eq(userGroupMembers.userId, userId));

      conditions.push(or(
        eq(agents.userId, userId),
        eq(agents.visibility, 'public'),
        and(
          eq(agents.visibility, 'selected_groups'),
          inArray(agents.id, userGroupsSubquery)
        )
      ));
    }

    if (keyword) {
      const k = `%${keyword}%`;
      conditions.push(or(ilike(agents.title, k), ilike(agents.description, k)));
    }
    
    if (categoryId) {
      conditions.push(eq(agents.categoryId, categoryId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agents)
      .where(whereClause);
    const total = Number(countResult?.count || 0);

    // Get paginated data
    const list = await db.query.agents.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: desc(agents.createdAt),
      with: {
        groups: {
          with: {
            group: true
          }
        }
      }
    });

    return { 
      data: list,
      total,
      page,
      limit
    };
  },

  async getById(id: string) {
    const [row] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
    if (!row) return null;

    const groups = await db.select({ groupId: agentUserGroups.groupId })
      .from(agentUserGroups)
      .where(eq(agentUserGroups.agentId, id));

    return {
      ...row,
      groupIds: groups.map(g => g.groupId)
    };
  },

  async create(data: {
    userId: string;
    apiKey: string;
    baseUrl?: string;
    visibility?: 'public' | 'private' | 'selected_groups';
    groupIds?: string[];
    categoryId?: string;
    multiplier?: number;
  }, userRole: string) {
    const { userId, apiKey, baseUrl: inputBaseUrl, categoryId, multiplier, groupIds } = data;
    const visibility = data.visibility || 'public';

    // Validate visibility and groups
    if (visibility === 'selected_groups') {
      if (!groupIds || groupIds.length === 0) {
         throw new Error('请选择可见用户组');
      }
      if (userRole === 'member') {
         // Check membership
         const members = await db.select().from(userGroupMembers).where(and(eq(userGroupMembers.userId, userId), inArray(userGroupMembers.groupId, groupIds)));
         if (members.length !== groupIds.length) {
            throw new Error('您只能选择自己加入的用户组');
         }
      }
    }

    const baseUrl = inputBaseUrl || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
    let resp;
    try {
      resp = await axios.get(`${baseUrl}/site`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 10000,
      });
    } catch (error) {
      console.warn('Validate agent failed', error);
      throw new Error('智能体不存在');
    }

    const siteData = resp.data || {};
    const title: string = siteData.title || '未命名智能体';
    const description: string = siteData.description || '';
    const iconType: string = siteData.icon_type || 'emoji';
    const iconUrl: string | null = iconType === 'image' ? (siteData.icon_url || null) : null;
    const iconBase64 = await fetchImageAsBase64(iconUrl);

    // validate category if provided
    let catId: string | undefined = categoryId;
    if (catId) {
      const [cat] = await db.select().from(categories).where(eq(categories.id, catId)).limit(1);
      if (!cat) {
        throw new Error('分类不存在');
      }
    }

    const [created] = await db.insert(agents).values({
      userId,
      title,
      description,
      apiKey,
      baseUrl: inputBaseUrl || null,
      iconUrl: iconBase64 || iconUrl || null,
      visibility,
      categoryId: catId,
      multiplier: multiplier ?? 1.0,
    }).returning();

    if (visibility === 'selected_groups' && groupIds && groupIds.length > 0) {
      await db.insert(agentUserGroups).values(
        groupIds.map(groupId => ({
          agentId: created.id,
          groupId
        }))
      );
    }

    return created;
  },

  async update(id: string, data: {
    apiKey?: string;
    baseUrl?: string;
    visibility?: 'public' | 'private' | 'selected_groups';
    groupIds?: string[];
    categoryId?: string;
    multiplier?: number;
  }, userId: string, userRole: string) {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
    if (!agent) {
      throw new Error('智能体不存在');
    }

    if (!['owner', 'admin'].includes(userRole)) {
      if (agent.userId !== userId) {
        throw new Error('无权限');
      }
    }

    // Validate visibility and groups if provided
    if (data.visibility === 'selected_groups') {
       if (data.groupIds && data.groupIds.length === 0) {
          throw new Error('请选择可见用户组');
       }
    }

    // Prepare update values
    const updateValues: any = {};
    if (data.apiKey !== undefined) updateValues.apiKey = data.apiKey;
    if (data.baseUrl !== undefined) updateValues.baseUrl = data.baseUrl;
    if (data.visibility !== undefined) updateValues.visibility = data.visibility;
    if (data.categoryId !== undefined) updateValues.categoryId = data.categoryId;
    if (data.multiplier !== undefined) updateValues.multiplier = data.multiplier;

    // If apiKey or baseUrl changed, validate and refresh info
    if (data.apiKey || (data.baseUrl && data.baseUrl !== agent.baseUrl)) {
         const apiKey = data.apiKey || agent.apiKey;
         const baseUrl = data.baseUrl || agent.baseUrl || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
         
         try {
            const resp = await axios.get(`${baseUrl}/site`, {
                headers: { Authorization: `Bearer ${apiKey}` },
                timeout: 10000,
            });
             // Update title/desc/icon if fetched successfully
             const siteData = resp.data || {};
             if (siteData.title) updateValues.title = siteData.title;
             if (siteData.description) updateValues.description = siteData.description;
             
             const iconType: string = siteData.icon_type || 'emoji';
             const iconUrl: string | null = iconType === 'image' ? (siteData.icon_url || null) : null;
             if (iconUrl) {
                 const iconBase64 = await fetchImageAsBase64(iconUrl);
                 if (iconBase64) updateValues.iconUrl = iconBase64;
             }
         } catch (error) {
             console.warn('Validate agent failed', error);
             throw new Error('无效的 API Key 或 Base URL');
         }
    }

    if (Object.keys(updateValues).length > 0) {
      await db.update(agents).set(updateValues).where(eq(agents.id, id));
    }

    // Update groups if groupIds is provided
    if (data.groupIds !== undefined) {
       // Clear existing
       await db.delete(agentUserGroups).where(eq(agentUserGroups.agentId, id));
       
       const targetVisibility = data.visibility || agent.visibility;
       if (targetVisibility === 'selected_groups' && data.groupIds.length > 0) {
           await db.insert(agentUserGroups).values(
               data.groupIds.map(groupId => ({
                   agentId: id,
                   groupId
               }))
           );
       }
    }
    
    return this.getById(id);
  },

  async delete(id: string, userId: string, userRole: string) {
    const [row] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
    if (!row) {
      throw new Error('智能体不存在');
    }

    if (!['owner', 'admin'].includes(userRole)) {
      if (row.userId !== userId) {
        throw new Error('无权限');
      }
    }
    
    await db.delete(agents).where(eq(agents.id, id));
  },

  // Dify Proxy Methods
  async getParameters(agent: typeof agents.$inferSelect) {
    const baseUrl = agent.baseUrl || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
    const resp = await axios.get(`${baseUrl}/parameters`, {
      headers: {
        Authorization: `Bearer ${agent.apiKey}`,
      },
      timeout: 10000,
    });
    return resp.data;
  },

  async getConversations(agent: typeof agents.$inferSelect, params: { user: string; last_id?: string; limit?: number }) {
    const baseUrl = agent.baseUrl || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
    const response = await axios.get(`${baseUrl}/conversations`, {
      params,
      headers: {
        Authorization: `Bearer ${agent.apiKey}`,
      },
      timeout: 10000,
    });
    return response.data;
  },

  async chatMessages(agent: typeof agents.$inferSelect, payload: any, userId: string, userRole: string) {
    // Check user balance if logged in
    if (userId) {
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (dbUser) {
        const role = dbUser.role;
        if (role === 'member' && dbUser.balance <= 0) {
          throw new Error('余额不足，请充值');
        }
      }
    }

    const baseUrl = agent.baseUrl || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
    const response = await axios.post(
      `${baseUrl}/chat-messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${agent.apiKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    );

    const logStream = createUsageLogStream(userId || 'web', userRole, agent.id, agent.multiplier);
    response.data.pipe(logStream);
    return logStream;
  },

  async deleteConversation(agent: typeof agents.$inferSelect, conversationId: string, user: string) {
    const baseUrl = agent.baseUrl || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
    const response = await axios.delete(`${baseUrl}/conversations/${conversationId}`, {
      data: { user },
      headers: {
        Authorization: `Bearer ${agent.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000,
    });
    return response.data;
  },

  async getMessages(agent: typeof agents.$inferSelect, params: { user: string; conversation_id: string; first_id?: string; limit?: number }) {
    const baseUrl = agent.baseUrl || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
    const response = await axios.get(`${baseUrl}/messages`, {
      params,
      headers: {
        Authorization: `Bearer ${agent.apiKey}`,
      },
      timeout: 10000,
    });
    return response.data;
  },

  async feedbackMessage(agent: typeof agents.$inferSelect, messageId: string, rating: string, user: string) {
    const baseUrl = agent.baseUrl || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
    const response = await axios.post(
      `${baseUrl}/messages/${messageId}/feedbacks`,
      { rating, user },
      {
        headers: {
          Authorization: `Bearer ${agent.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000,
      }
    );
    return response.data;
  },

  async uploadFile(agent: typeof agents.$inferSelect, fileData: any, user: string) {
    const buffer = await fileData.toBuffer();
    const blob = new Blob([buffer], { type: fileData.mimetype });
    const form = new FormData();
    form.append('file', blob, fileData.filename);
    form.append('user', user);
    
    const baseUrl = agent.baseUrl || process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';
    const resp = await axios.post(`${baseUrl}/files/upload`, form, {
      headers: {
        Authorization: `Bearer ${agent.apiKey}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return resp.data;
  }
};
