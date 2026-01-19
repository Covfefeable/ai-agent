import { db } from '../db';
import { userFavoriteAgents, agents } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { transformToProxyUrl } from '../lib/minio';

export const favoritesService = {
  async add(userId: string, agentId: string) {
    await db.insert(userFavoriteAgents).values({
      userId,
      agentId,
    }).onConflictDoNothing();
    return { success: true };
  },

  async remove(userId: string, agentId: string) {
    await db.delete(userFavoriteAgents)
      .where(and(
        eq(userFavoriteAgents.userId, userId),
        eq(userFavoriteAgents.agentId, agentId)
      ));
    return { success: true };
  },

  async check(userId: string, agentId: string) {
    const existing = await db.select()
      .from(userFavoriteAgents)
      .where(and(
        eq(userFavoriteAgents.userId, userId),
        eq(userFavoriteAgents.agentId, agentId)
      ))
      .limit(1);

    return { isFavorite: existing.length > 0 };
  },

  async list(userId: string) {
    const favorites = await db.select({
      agent: agents,
      favoritedAt: userFavoriteAgents.createdAt
    })
    .from(userFavoriteAgents)
    .innerJoin(agents, eq(userFavoriteAgents.agentId, agents.id))
    .where(eq(userFavoriteAgents.userId, userId))
    .orderBy(desc(userFavoriteAgents.createdAt));

    const data = await Promise.all(favorites.map(async f => ({
      ...f.agent,
      iconUrl: await transformToProxyUrl(f.agent.iconUrl),
      favoritedAt: f.favoritedAt
    })));

    return { data };
  }
};
