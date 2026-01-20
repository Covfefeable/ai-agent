import { FastifyInstance } from 'fastify';
import { knowledgeController } from '../controllers/knowledge';

export async function knowledgeRoutes(fastify: FastifyInstance) {
  // Datasets
  fastify.post('/datasets', knowledgeController.createDataset);
  fastify.get('/datasets', knowledgeController.listDatasets);
  fastify.delete('/datasets/:id', knowledgeController.deleteDataset);
  fastify.patch('/datasets/:id', knowledgeController.updateDataset);

  // Documents
  fastify.get('/datasets/:id/documents', knowledgeController.listDocuments);
  fastify.post('/datasets/:id/documents/upload', knowledgeController.createDocumentByFile);
  fastify.post('/datasets/:id/documents/create-by-text', knowledgeController.createDocumentByText);
  fastify.get('/datasets/:id/documents/:documentId/download', knowledgeController.getDownloadUrl);
  fastify.delete('/datasets/:id/documents/:documentId', knowledgeController.deleteDocument);

  // Segments
  fastify.get('/datasets/:id/documents/:documentId/segments', knowledgeController.listSegments);
  fastify.post('/datasets/:id/documents/:documentId/segments/:segmentId', knowledgeController.updateSegment);
  fastify.delete('/datasets/:id/documents/:documentId/segments/:segmentId', knowledgeController.deleteSegment);
}
