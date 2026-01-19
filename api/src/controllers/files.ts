import { FastifyRequest, FastifyReply } from 'fastify';
import { minioClient } from '../lib/minio';
import * as crypto from 'crypto';

const FILE_URL_SIGN_SECRET = process.env.FILE_URL_SIGN_SECRET;

export const filesController = {
  async getFile(request: FastifyRequest, reply: FastifyReply) {
    const path = (request.params as any)['*']; // wildcard capture
    if (!path) {
      return reply.status(400).send({ message: 'Invalid path' });
    }

    // Validate Signature
    if (FILE_URL_SIGN_SECRET) {
      const { sign, expires } = request.query as { sign?: string; expires?: string };
      
      if (!sign || !expires) {
        return reply.status(403).send({ message: 'Missing signature' });
      }
      
      const expiresTs = Number(expires);
      if (isNaN(expiresTs) || expiresTs < Math.floor(Date.now() / 1000)) {
        return reply.status(403).send({ message: 'Link expired' });
      }
      
      const normalizedPath = '/' + path; // path captured by wildcard doesn't have leading slash
      const data = `${normalizedPath}:${expires}`;
      const expectedSign = crypto.createHmac('sha256', FILE_URL_SIGN_SECRET).update(data).digest('hex');
      
      if (sign !== expectedSign) {
        return reply.status(403).send({ message: 'Invalid signature' });
      }
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
