import { FastifyInstance } from 'fastify';
import { usersController } from '../controllers/users';

export async function usersRoutes(fastify: FastifyInstance) {
  // Get current user info
  fastify.get('/me', usersController.getMe);

  // Get user usage list
  fastify.get('/me/usage', usersController.getUsage);

  // Update password
  fastify.patch('/me/password', usersController.updatePassword);

  // Update user info (nickname)
  fastify.patch('/me/info', usersController.updateInfo);

  // Update avatar
  fastify.patch('/me/avatar', usersController.updateAvatar);

  // Get users list (Owner/Admin only)
  fastify.get('/', usersController.list);

  // Update user role (Owner/Admin only)
  fastify.patch('/:id/role', usersController.updateRole);

  // Recharge user balance (Owner/Admin only)
  fastify.post('/:id/recharge', usersController.recharge);
}
