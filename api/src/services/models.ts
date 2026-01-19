import { db } from '../db';
import { models, modelUserGroups, userGroupMembers } from '../db/schema';
import { eq, desc, ilike, or, and, sql, asc, inArray } from 'drizzle-orm';
import { uploadBase64, deleteFile, extractPathFromUrl, transformToProxyUrl } from '../lib/minio';

export const modelsService = {
  async listModels(user: any, query: { keyword?: string; page?: number; limit?: number }) {
    const { keyword, page = 1, limit = 20 } = query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];

    if (keyword) {
      const k = `%${keyword}%`;
      conditions.push(or(ilike(models.name, k), ilike(models.modelId, k)));
    }

    // Visibility filter for non-admin users
    if (!['owner', 'admin'].includes(user.role)) {
      // Get user's groups
      const userGroupsList = await db
        .select({ groupId: userGroupMembers.groupId })
        .from(userGroupMembers)
        .where(eq(userGroupMembers.userId, user.id));
      
      const groupIds = userGroupsList.map(g => g.groupId);

      let allowedModelIds: string[] = [];
      if (groupIds.length > 0) {
        const allowed = await db
          .select({ modelId: modelUserGroups.modelId })
          .from(modelUserGroups)
          .where(inArray(modelUserGroups.groupId, groupIds));
        allowedModelIds = allowed.map(m => m.modelId);
      }

      if (allowedModelIds.length > 0) {
         conditions.push(
          or(
            eq(models.visibility, 'public'),
            and(
              eq(models.visibility, 'selected_groups'),
              inArray(models.id, allowedModelIds)
            )
          )
        );
      } else {
        conditions.push(eq(models.visibility, 'public'));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(models)
      .where(whereClause);
    const total = Number(countResult?.count || 0);

    // Get paginated data
    const list = await db.query.models.findMany({
      where: whereClause,
      limit: limitNum,
      offset: offset,
      orderBy: [asc(models.sort), desc(models.createdAt)],
      with: {
        groups: {
          with: {
            group: true
          }
        }
      }
    });

    const listWithGroups = await Promise.all(list.map(async model => ({
      ...model,
      iconUrl: await transformToProxyUrl(model.iconUrl),
      groupIds: model.groups?.map((g: any) => g.groupId) || [],
      groups: model.groups?.map((g: any) => g.group.name).join(',') || undefined
    })));

    return { 
      data: listWithGroups,
      total,
      page: pageNum,
      limit: limitNum
    };
  },

  async getModel(id: string, user: any) {
    const row = await db.query.models.findFirst({
      where: eq(models.id, id),
      with: {
        groups: true
      }
    });
    
    if (!row) {
      throw new Error('模型不存在');
    }

    if (row.iconUrl) {
      row.iconUrl = await transformToProxyUrl(row.iconUrl);
    }

    // Access control
    if (!['owner', 'admin'].includes(user.role)) {
      if (row.visibility === 'private') {
         throw new Error('无权限');
      }
      if (row.visibility === 'selected_groups') {
         const allowedGroupIds = row.groups.map((g: any) => g.groupId);
         if (allowedGroupIds.length === 0) throw new Error('无权限');

         const [match] = await db.select({ id: userGroupMembers.id })
           .from(userGroupMembers)
           .where(and(
             eq(userGroupMembers.userId, user.id),
             inArray(userGroupMembers.groupId, allowedGroupIds)
           ))
           .limit(1);

         if (!match) {
           throw new Error('无权限');
         }
      }
    }

    let groupIds: string[] = [];
    if (row.visibility === 'selected_groups') {
      groupIds = row.groups.map((g: any) => g.groupId);
    }

    const { groups, ...rest } = row;
    return { data: { ...rest, groupIds } };
  },

  async createModel(data: any) {
    // Check if modelId exists
    const [existing] = await db.select().from(models).where(eq(models.modelId, data.modelId)).limit(1);
    if (existing) {
      throw new Error('模型ID已存在');
    }

    // Handle icon upload
    if (data.iconUrl && data.iconUrl.startsWith('data:image')) {
      const uploaded = await uploadBase64(data.iconUrl, `models/${Date.now()}-${Math.random().toString(36).substring(7)}`);
      if (uploaded) {
        data.iconUrl = uploaded;
      }
    }

    const [created] = await db.insert(models).values({
      name: data.name,
      modelId: data.modelId,
      sort: data.sort,
      enabled: data.enabled,
      iconUrl: data.iconUrl || null,
      multiplier: data.multiplier,
      visibility: data.visibility,
    }).returning();

    if (data.visibility === 'selected_groups' && data.groupIds && data.groupIds.length > 0) {
      await db.insert(modelUserGroups).values(
        data.groupIds.map((groupId: string) => ({
          modelId: created.id,
          groupId,
        }))
      );
    }

    return { data: created };
  },

  async updateModel(id: string, data: any) {
    const [existing] = await db.select().from(models).where(eq(models.id, id)).limit(1);
    if (!existing) {
      throw new Error('模型不存在');
    }

    if (data.modelId && data.modelId !== existing.modelId) {
      const [dup] = await db.select().from(models).where(eq(models.modelId, data.modelId)).limit(1);
      if (dup) {
        throw new Error('模型ID已存在');
      }
    }

    // Prepare update data, excluding groupIds
    const { groupIds, ...updateData } = data;

    // Handle icon upload
    if (updateData.iconUrl && updateData.iconUrl.startsWith('data:image')) {
        const uploaded = await uploadBase64(updateData.iconUrl, `models/${id}-${Date.now()}`);
        if (uploaded) {
            updateData.iconUrl = uploaded;

            // Delete old icon
            if (existing.iconUrl) {
                const oldPath = extractPathFromUrl(existing.iconUrl);
                if (oldPath) {
                    deleteFile(oldPath).catch((err: any) => console.error('Background delete failed', err));
                }
            }
        }
    }

    const [updated] = await db.update(models)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(models.id, id))
      .returning();

    // Handle group relations if visibility or groupIds provided
    if (data.visibility !== undefined || data.groupIds !== undefined) {
      const newVisibility = data.visibility ?? existing.visibility;
      
      // Always clear existing relations first if we are updating groups or switching to public/private
      if (newVisibility === 'public' || newVisibility === 'private') {
         await db.delete(modelUserGroups).where(eq(modelUserGroups.modelId, id));
      } else if (newVisibility === 'selected_groups' && data.groupIds) {
         // Replace groups
         await db.delete(modelUserGroups).where(eq(modelUserGroups.modelId, id));
         if (data.groupIds.length > 0) {
           await db.insert(modelUserGroups).values(
             data.groupIds.map((groupId: string) => ({
               modelId: id,
               groupId,
             }))
           );
         }
      }
    }

    return { data: updated };
  },

  async deleteModel(id: string) {
    const [existing] = await db.select().from(models).where(eq(models.id, id)).limit(1);
    if (!existing) {
      throw new Error('模型不存在');
    }

    await db.delete(models).where(eq(models.id, id));
    
    // Delete icon if exists
    if (existing.iconUrl) {
        const oldPath = extractPathFromUrl(existing.iconUrl);
        if (oldPath) {
            deleteFile(oldPath).catch((err: any) => console.error('Background delete failed', err));
        }
    }
    
    return { message: '已删除' };
  }
};
