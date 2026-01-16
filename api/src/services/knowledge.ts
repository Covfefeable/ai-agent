import axios from 'axios';
import FormData from 'form-data';
import { db } from '../db';
import { datasets } from '../db/schema';
import { eq, desc, and, ilike, or, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';

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

    try {
      await axios.delete(`${DIFY_BASE_URL}/datasets/${dataset.difyId}`, {
        headers: {
          'Authorization': `Bearer ${DIFY_KNOWLEDGE_API_KEY}`
        }
      });
    } catch (difyError: any) {
      console.error('Dify Delete Error:', difyError.response?.data || difyError.message);
      if (difyError.response?.status !== 404) {
        // Log but continue
      }
    }

    await db.delete(datasets).where(eq(datasets.id, id));
    return { message: '知识库删除成功' };
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

    const response = await axios.get(`${DIFY_BASE_URL}/datasets/${dataset.difyId}/documents`, {
      params: query,
      headers: {
        'Authorization': `Bearer ${DIFY_KNOWLEDGE_API_KEY}`
      }
    });

    return response.data;
  },

  async createDocumentByFile(id: string, userId: string, userRole: string, fileData: { buffer: Buffer; filename: string; mimetype: string }, options: { separator: string; max_tokens: number }) {
    const dataset = await this.getDataset(id, userId, userRole);
    if (!dataset) {
      throw new Error('知识库不存在');
    }

    const form = new FormData();
    const dataPayload = {
      indexing_technique: "high_quality",
      doc_form: "hierarchical_model",
      process_rule: {
        mode: "hierarchical",
        rules: {
          pre_processing_rules: [
            {
              id: "remove_extra_spaces",
              enabled: true
            },
          ],
          segmentation: {
            separator: options.separator,
            max_tokens: options.max_tokens
          },
          parent_mode: "paragraph",
          subchunk_segmentation: {
            separator: "\n",
            max_tokens: 100,
            chunk_overlap: 10
          }
        }
      }
    };

    form.append('data', JSON.stringify(dataPayload));
    form.append('file', fileData.buffer, { filename: fileData.filename, contentType: fileData.mimetype });

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

    return response.data;
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

    const response = await axios.delete(
      `${DIFY_BASE_URL}/datasets/${dataset.difyId}/documents/${documentId}`,
      {
        headers: {
          'Authorization': `Bearer ${DIFY_KNOWLEDGE_API_KEY}`
        }
      }
    );

    return response.data;
  },

  async listSegments(id: string, documentId: string, userId: string, userRole: string, query: { page?: number; limit?: number }) {
    const dataset = await this.getDataset(id, userId, userRole);
    if (!dataset) {
      throw new Error('知识库不存在');
    }

    const response = await axios.get(
      `${DIFY_BASE_URL}/datasets/${dataset.difyId}/documents/${documentId}/segments`,
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

    const response = await axios.post(
      `${DIFY_BASE_URL}/datasets/${dataset.difyId}/documents/${documentId}/segments/${segmentId}`,
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

    const response = await axios.delete(
      `${DIFY_BASE_URL}/datasets/${dataset.difyId}/documents/${documentId}/segments/${segmentId}`,
      {
        headers: {
          'Authorization': `Bearer ${DIFY_KNOWLEDGE_API_KEY}`
        }
      }
    );

    return response.data;
  },

  async retrieve(id: string, userId: string, userRole: string, query: string) {
    const dataset = await this.getDataset(id, userId, userRole);
    if (!dataset) {
      throw new Error('知识库不存在');
    }

    const response = await axios.post(
      `${DIFY_BASE_URL}/datasets/${dataset.difyId}/retrieve`,
      {
        query
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
