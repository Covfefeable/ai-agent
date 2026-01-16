import { db } from '../db';
import { categories } from '../db/schema';
import { eq, desc, asc } from 'drizzle-orm';

export const agentCategoryService = {
  async list() {
    return await db.select().from(categories).orderBy(asc(categories.sort), desc(categories.createdAt));
  },

  async create(data: { name: string; sort?: number }) {
    const [created] = await db.insert(categories).values({ 
      name: data.name, 
      sort: data.sort || 0 
    }).returning();
    return created;
  },

  async update(id: string, data: { name?: string; sort?: number }) {
    const [updated] = await db.update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();
    return updated;
  },

  async delete(id: string) {
    await db.delete(categories).where(eq(categories.id, id));
  }
};
