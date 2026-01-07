import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { userFavoriteAgents, agents } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

export async function favoritesRoutes(fastify: FastifyInstance) {
  // Add favorite
  fastify.post('/', async (request: any, reply) => {
    const schema = z.object({
      agentId: z.string().uuid(),
    });

    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send(result.error);
    }

    const { agentId } = result.data;
    const userId = request.user.id;

    try {
      await db.insert(userFavoriteAgents).values({
        userId,
        agentId,
      }).onConflictDoNothing();

      return { success: true };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Remove favorite
  fastify.delete('/:agentId', async (request: any, reply) => {
    const { agentId } = request.params as { agentId: string };
    const userId = request.user.id;

    try {
      await db.delete(userFavoriteAgents)
        .where(and(
          eq(userFavoriteAgents.userId, userId),
          eq(userFavoriteAgents.agentId, agentId)
        ));
      return { success: true };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // Check if favorite
  fastify.get('/:agentId/check', async (request: any, reply) => {
    const { agentId } = request.params as { agentId: string };
    const userId = request.user.id;

    try {
      const existing = await db.select()
        .from(userFavoriteAgents)
        .where(and(
          eq(userFavoriteAgents.userId, userId),
          eq(userFavoriteAgents.agentId, agentId)
        ))
        .limit(1);

      return { isFavorite: existing.length > 0 };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  });

  // List favorites
  fastify.get('/', async (request: any, reply) => {
    const userId = request.user.id;
    try {
      const favorites = await db.select({
        agent: agents,
        favoritedAt: userFavoriteAgents.createdAt
      })
      .from(userFavoriteAgents)
      .innerJoin(agents, eq(userFavoriteAgents.agentId, agents.id))
      .where(eq(userFavoriteAgents.userId, userId))
      .orderBy(desc(userFavoriteAgents.createdAt));

      return { data: favorites.map(f => ({ ...f.agent, favoritedAt: f.favoritedAt })) };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  });
}
