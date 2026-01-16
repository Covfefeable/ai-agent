import { FastifyInstance } from 'fastify';
import { userGroupsController } from '../controllers/user-groups';

export async function userGroupsRoutes(fastify: FastifyInstance) {
  // Check auth for all routes
  fastify.addHook('preHandler', async (request: any, reply) => {
    const userRole = request.user?.role;
    if (!['owner', 'admin'].includes(userRole)) {
      return reply.status(403).send({ message: '无权访问' });
    }
  });

  // Get user groups list
  fastify.get('/', userGroupsController.list);

  // Create user group
  fastify.post('/', userGroupsController.create);

  // Update user group
  fastify.put('/:id', userGroupsController.update);

  // Delete user group
  fastify.delete('/:id', userGroupsController.delete);

  // Get users with membership status for a group
  fastify.get('/:id/users', userGroupsController.getGroupUsers);

  // Add users to group
  fastify.post('/:id/users', userGroupsController.addUsers);

  // Batch update users in group (add and remove)
  fastify.put('/:id/users', userGroupsController.updateGroupUsers);
}
