import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Plus, Loader2, X, Calendar, FileText, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { knowledgeApi } from '@/api/knowledge';

interface KnowledgeBase {
  id: string;
  difyId: string;
  name: string;
  description: string;
  createdAt: string;
}

export function KnowledgePage() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchKnowledgeBases = async () => {
    try {
      setIsLoading(true);
      const response = await knowledgeApi.getDatasets();
      setKnowledgeBases(response.data);
    } catch (error: any) {
      console.error('Failed to fetch knowledge bases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setFormData({ name: '', description: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (kb: KnowledgeBase) => {
    setModalMode('edit');
    setCurrentId(kb.id);
    setFormData({ name: kb.name, description: kb.description || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsSubmitting(true);
      
      if (modalMode === 'create') {
        await knowledgeApi.createDataset(formData);
        toast.success('知识库创建成功');
      } else {
        if (currentId) {
          await knowledgeApi.updateDataset(currentId, formData);
          toast.success('知识库更新成功');
        }
      }
      
      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
      fetchKnowledgeBases();
    } catch (error: any) {
      console.error(`Failed to ${modalMode} knowledge base:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await knowledgeApi.deleteDataset(deleteId);
      setKnowledgeBases(prev => prev.filter(kb => kb.id !== deleteId));
      setDeleteId(null);
      toast.success('知识库删除成功');
    } catch (error: any) {
      console.error('Failed to delete knowledge base:', error);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-slate-100 px-8">
        <h2 className="text-lg font-bold text-slate-800">知识库</h2>
        <Button 
          onClick={openCreateModal}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          <Plus className="h-4 w-4" />
          新建知识库
        </Button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : knowledgeBases.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {knowledgeBases.map((kb) => (
              <div 
                key={kb.id}
                onClick={() => navigate(`/knowledge/${kb.id}`)}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md cursor-pointer"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Database className="h-5 w-5" />
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(kb);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                        title="编辑知识库"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(kb.id);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="删除知识库"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-slate-900 line-clamp-1" title={kb.name}>
                    {kb.name}
                  </h3>
                  <p className="mb-4 text-sm text-slate-500 line-clamp-2 min-h-[40px]" title={kb.description}>
                    {kb.description || '暂无描述'}
                  </p>
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-50 pt-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{format(new Date(kb.createdAt), 'yyyy-MM-dd')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    <span>0 文档</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
                <Database className="h-10 w-10" />
              </div>
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">暂无知识库</h3>
            <p className="text-slate-500">点击右上角按钮创建一个新的知识库。</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {modalMode === 'create' ? '新建知识库' : '编辑知识库'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">名称</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入知识库名称"
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">描述</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="请输入知识库描述"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  取消
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {modalMode === 'create' ? '创建中...' : '保存中...'}
                    </>
                  ) : (
                    modalMode === 'create' ? '立即创建' : '保存修改'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="删除知识库"
        description="确定要删除这个知识库吗？此操作无法撤销，知识库内的所有数据将被永久删除。"
      />
    </div>
  );
}
