import { FastifyRequest, FastifyReply } from 'fastify';
import { minioClient } from '../lib/minio';

export const filesController = {
  async getFile(request: FastifyRequest, reply: FastifyReply) {
    const path = (request.params as any)['*']; // wildcard capture
    if (!path) {
      return reply.status(400).send({ message: 'Invalid path' });
    }

    // path is like "super-agent/avatars/123.png"
    const parts = path.split('/');
    if (parts.length < 2) {
       return reply.status(404).send({ message: 'File not found' });
    }

    const bucketName = parts[0];
    const objectName = parts.slice(1).join('/');

    try {
      // Check if object exists and get stats
      const stat = await minioClient.statObject(bucketName, objectName);
      
      // Get object stream
      const dataStream = await minioClient.getObject(bucketName, objectName);
      
      // Set headers
      reply.header('Content-Type', stat.metaData['content-type'] || 'application/octet-stream');
      reply.header('Content-Length', stat.size);
      reply.header('Cache-Control', 'public, max-age=31536000');
      
      return reply.send(dataStream);
    } catch (error) {
      // request.log.error({ error, bucketName, objectName }, 'File not found or error');
      return reply.status(404).send({ message: 'File not found' });
    }
  }
};
