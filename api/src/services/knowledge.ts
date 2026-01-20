import axios from 'axios';
import FormData from 'form-data';
import { db } from '../db';
import { datasets, documents } from '../db/schema';
import { eq, desc, and, ilike, or, sql, inArray } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { uploadBuffer, deleteFile, getPublicUrl } from '../lib/minio';

const DIFY_BASE_URL = process.env.DIFY_BASE_URL;
const DIFY_KNOWLEDGE_API_KEY = process.env.DIFY_KNOWLEDGE_API_KEY;

export const knowledgeService = {
  async getDataset(id: string, userId: string, userRole: string) {
    const conditions = [eq(datasets.id, id)];
    if (!['owner', 'admin'].includes(userRole)) {
      conditions.push(eq(datasets.userId, userId));
    }

    const [dataset] = await db.select()
      .from(datasets)
      .where(and(...conditions))
      .limit(1);

    return dataset;
  },

  async createDataset(userId: string, data: any) {
    const suffix = randomBytes(3).toString('hex');
    const difyName = `${data.name}_${suffix}`;

    const payload = {
      ...data,
      name: difyName,
      retrieval_model: {
        search_method: 'hybrid_search',
        reranking_enable: true,
        top_k: 5,
        score_threshold_enabled: false,
      },
    };

    const response = await axios.post(`${DIFY_BASE_URL}/datasets`, payload, {
      headers: {
        'Authorization': `Bearer ${DIFY_KNOWLEDGE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const difyDataset = response.data;

    const [newDataset] = await db.insert(datasets).values({
      difyId: difyDataset.id,
      userId: userId,
      name: data.name,
      description: data.description,
    }).returning();

    return { ...difyDataset, localId: newDataset.id };
  },

  async listDatasets(userId: string, userRole: string, query: { keyword?: string; page?: number; limit?: number }) {
    const { keyword, page = 1, limit = 20 } = query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    
    const conditions = [];
    
    if (!['owner', 'admin'].includes(userRole)) {
      conditions.push(eq(datasets.userId, userId));
    }
    
    if (keyword) {
      conditions.push(or(
        ilike(datasets.name, `%${keyword}%`), 
        ilike(datasets.description, `%${keyword}%`)
      ));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(datasets)
      .where(whereClause);
    const total = Number(countResult?.count || 0);
    
    const userDatasets = await db.select()
      .from(datasets)
      .where(whereClause)
      .orderBy(desc(datasets.createdAt))
      .limit(limitNum)
      .offset(offset);
    
    return { 
      data: userDatasets,
      total,
      page: pageNum,
      limit: limitNum
    };
  },

  async deleteDataset(id: string, userId: string, userRole: string) {
    const dataset = await this.getDataset(id, userId, userRole);
    if (!dataset) {
      throw new Error('知识库不存在');
    }

    // 1. Clean up OSS files
    const docs = await db.select().from(documents).where(eq(documents.datasetId, id));
    for (const doc of docs) {
      await deleteFile(doc.url);
    }

    try {
      await axios.delete(`${DIFY_BASE_URL}/datasets/${dataset.difyId}`, {
        headers: {
          'Authorization': `Bearer ${DIFY_KNOWLEDGE_API_KEY}`
        }
      });
    } catch (error) {
      console.error('Delete Dify dataset failed', error);
    }

    await db.delete(datasets).where(eq(datasets.id, id));

    return { success: true };
  },

  async updateDataset(id: string, userId: string, userRole: string, data: { name?: string; description?: string }) {
    const dataset = await this.getDataset(id, userId, userRole);
    if (!dataset) {
      throw new Error('知识库不存在');
    }

    const { name, description } = data;
    
    const difyUpdatePayload: any = { description };
    if (name) {
      const suffix = randomBytes(3).toString('hex');
      difyUpdatePayload.name = `${name}_${suffix}`;
    }

    await axios.patch(`${DIFY_BASE_URL}/datasets/${dataset.difyId}`, difyUpdatePayload, {
      headers: {
        'Authorization': `Bearer ${DIFY_KNOWLEDGE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const [updatedDataset] = await db.update(datasets)
      .set({ name, description })
      .where(eq(datasets.id, id))
      .returning();

    return updatedDataset;
  },

  async listDocuments(id: string, userId: string, userRole: string, query: { page?: number; limit?: number; keyword?: string }) {
    const dataset = await this.getDataset(id, userId, userRole);
    if (!dataset) {
      throw new Error('知识库不存在');
    }

    const { page = 1, limit = 20, keyword } = query;
    
    // 1. Get document list from Dify API
    const response = await axios.get(`${DIFY_BASE_URL}/datasets/${dataset.difyId}/documents`, {
      params: {
        page,
        limit,
        keyword
      },
      headers: {
        'Authorization': `Bearer ${DIFY_KNOWLEDGE_API_KEY}`
      }
    });

    const difyDocs = response.data.data;
    const difyTotal = response.data.total;
    
    // 2. Map Dify IDs to local records to get download URLs
    const difyIds = difyDocs.map((doc: any) => doc.id);
    
    if (difyIds.length > 0) {
        const localDocs = await db.select({
            difyId: documents.difyId,
            url: documents.url,
            id: documents.id
        })
        .from(documents)
        .where(inArray(documents.difyId, difyIds));

        // Create a map for quick lookup
        const localDocMap = new Map(localDocs.map(doc => [doc.difyId, doc]));

        // Merge downloadUrl and local ID into Dify response
        const mergedDocs = difyDocs.map((doc: any) => {
            const localDoc = localDocMap.get(doc.id);
            return {
                ...doc,
                id: localDoc ? localDoc.id : doc.id, // Prefer local ID if available for consistency
                difyId: doc.id, // Keep original Dify ID
                // Remove direct downloadUrl generation to avoid expired links
                hasFile: !!localDoc
            };
        });
        
        return {
            data: mergedDocs,
            total: difyTotal,
            page: response.data.page,
            limit: response.data.limit,
            has_more: response.data.has_more
        };
    }

    return response.data;
  },

  async getDocumentDownloadUrl(id: string, documentId: string, userId: string, userRole: string) {
    const dataset = await this.getDataset(id, userId, userRole);
    if (!dataset) {
      throw new Error('知识库不存在');
    }

    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    
    if (!doc) {
        throw new Error('文档不存在或不支持下载');
    }

    // Check dataset permission (already done in getDataset but doc must belong to dataset)
    if (doc.datasetId !== dataset.id) {
        throw new Error('文档不属于该知识库');
    }

    return {
        url: getPublicUrl(doc.url, doc.name)
    };
  },

  async createDocumentByFile(id: string, userId: string, userRole: string, fileData: { buffer: Buffer; filename: string; mimetype: string }, options: { separator: string; max_tokens: number }) {
    const dataset = await this.getDataset(id, userId, userRole);
    if (!dataset) {
      throw new Error('知识库不存在');
    }

    // 1. Upload to MinIO
    const timestamp = Date.now();
    const objectName = `documents/${userId}/${timestamp}_${fileData.filename}`;
    const minioPath = await uploadBuffer(fileData.buffer, objectName, fileData.mimetype);

    // 2. Upload to Dify
    const form = new FormData();
    const dataPayload = {
      indexing_technique: "high_quality",
      doc_form: "hierarchical_model",
      process_rule: {
        mode: "hierarchical",
        rules: {
          pre_processing_rules: [
            { id: "remove_extra_spaces", enabled: true },
          ],
          segmentation: {
            separator: options.separator,
            max_tokens: options.max_tokens
          },
          parent_mode: "paragraph",
          subchunk_segmentation: {
            separator: "\n",
            max_tokens: 100,
            chunk_overlap: 10,
          },
        }
      }
    };

    form.append('data', JSON.stringify(dataPayload));
    form.append('file', fileData.buffer, { filename: fileData.filename, contentType: fileData.mimetype });

    try {
      const response = await axios.post(
        `${DIFY_BASE_URL}/datasets/${dataset.difyId}/document/create-by-file`,
        form,
        {
          headers: {
            'Authorization': `Bearer ${DIFY_KNOWLEDGE_API_KEY}`,
            ...form.getHeaders()
          }
        }
      );
      
      const difyDoc = response.data.document;

      // 3. Insert into DB
      const [newDoc] = await db.insert(documents).values({
          datasetId: dataset.id,
          userId: userId,
          name: fileData.filename,
          size: fileData.buffer.length,
          url: minioPath,
          mimeType: fileData.mimetype,
          extension: fileData.filename.split('.').pop() || '',
          difyId: difyDoc.id
      }).returning();

      return { ...newDoc, downloadUrl: getPublicUrl(newDoc.url) };

    } catch (error) {
      // Cleanup MinIO if Dify fails
      await deleteFile(minioPath);
      throw error;
    }
  },

  async createDocumentByText(id: string, userId: string, userRole: string, data: any) {
    const dataset = await this.getDataset(id, userId, userRole);
    if (!dataset) {
      throw new Error('知识库不存在');
    }

    const response = await axios.post(
      `${DIFY_BASE_URL}/datasets/${dataset.difyId}/document/create-by-text`,
      {
        name: data.name,
        text: data.text,
        indexing_technique: data.indexing_technique,
        doc_form: data.doc_form,
        process_rule: {
          mode: "hierarchical",
          rules: {
            pre_processing_rules: [
              { id: "remove_extra_spaces", enabled: true },
            ],
            segmentation: {
              separator: data.separator,
              max_tokens: data.max_tokens
            },
            parent_mode: "paragraph",
            subchunk_segmentation: {
              separator: "\n",
              max_tokens: 100,
              chunk_overlap: 10,
            },
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${DIFY_KNOWLEDGE_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    return response.data;
  },

  async deleteDocument(id: string, documentId: string, userId: string, userRole: string) {
    const dataset = await this.getDataset(id, userId, userRole);
    if (!dataset) {
      throw new Error('知识库不存在');
    }

    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    
    // If doc exists locally, delete from OSS and DB
    if (doc) {
        await deleteFile(doc.url);
        await db.delete(documents).where(eq(documents.id, documentId));
    }

    const difyIdToDelete = doc ? doc.difyId : documentId;
    
    if (difyIdToDelete) {
        try {
            await axios.delete(
              `${DIFY_BASE_URL}/datasets/${dataset.difyId}/documents/${difyIdToDelete}`,
              {
                headers: {
                  'Authorization': `Bearer ${DIFY_KNOWLEDGE_API_KEY}`
                }
              }
            );
        } catch (e) {
            console.error('Dify delete failed', e);
        }
    }

    return { success: true };
  },

  async listSegments(id: string, documentId: string, userId: string, userRole: string, query: { page?: number; limit?: number }) {
    const dataset = await this.getDataset(id, userId, userRole);
    if (!dataset) {
      throw new Error('知识库不存在');
    }

    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    const difyDocumentId = doc ? doc.difyId : documentId;

    const response = await axios.get(
      `${DIFY_BASE_URL}/datasets/${dataset.difyId}/documents/${difyDocumentId}/segments`,
      {
        params: query,
        headers: {
          'Authorization': `Bearer ${DIFY_KNOWLEDGE_API_KEY}`
        }
      }
    );

    return response.data;
  },

  async updateSegment(id: string, documentId: string, segmentId: string, userId: string, userRole: string, data: any) {
    const dataset = await this.getDataset(id, userId, userRole);
    if (!dataset) {
      throw new Error('知识库不存在');
    }

    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    const difyDocumentId = doc ? doc.difyId : documentId;

    const response = await axios.post(
      `${DIFY_BASE_URL}/datasets/${dataset.difyId}/documents/${difyDocumentId}/segments/${segmentId}`,
      data,
      {
        headers: {
          'Authorization': `Bearer ${DIFY_KNOWLEDGE_API_KEY}`
        }
      }
    );

    return response.data;
  },

  async deleteSegment(id: string, documentId: string, segmentId: string, userId: string, userRole: string) {
    const dataset = await this.getDataset(id, userId, userRole);
    if (!dataset) {
      throw new Error('知识库不存在');
    }

    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    const difyDocumentId = doc ? doc.difyId : documentId;

    const response = await axios.delete(
      `${DIFY_BASE_URL}/datasets/${dataset.difyId}/documents/${difyDocumentId}/segments/${segmentId}`,
      {
        headers: {
          'Authorization': `Bearer ${DIFY_KNOWLEDGE_API_KEY}`
        }
      }
    );

    return response.data;
  },

  async retrieve(id: string, userId: string, userRole: string, query: string, top_k?: number) {
    const dataset = await this.getDataset(id, userId, userRole);
    if (!dataset) {
      throw new Error('知识库不存在');
    }

    const response = await axios.post(
      `${DIFY_BASE_URL}/datasets/${dataset.difyId}/retrieve`,
      {
        query,
        retrieval_model: {
          reranking_enable: false,
          top_k: top_k || 5,
          score_threshold_enabled: false
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${DIFY_KNOWLEDGE_API_KEY}`
        }
      }
    );

    return response.data;
  }
};
