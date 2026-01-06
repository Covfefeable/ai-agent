import { useState, useEffect } from 'react';
import { Database, Plus, Loader2, X, Calendar, FileText, Trash2 } from 'lucide-react';
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsCreating(true);
      await knowledgeApi.createDataset(formData);
      
      setIsCreateModalOpen(false);
      setFormData({ name: '', description: '' });
      toast.success('知识库创建成功');
      fetchKnowledgeBases();
    } catch (error: any) {
      console.error('Failed to create knowledge base:', error);
    } finally {
      setIsCreating(false);
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
          onClick={() => setIsCreateModalOpen(true)}
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
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
              >
                <div>
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Database className="h-5 w-5" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(kb.id);
                      }}
                      className="rounded-lg p-1.5 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 transition-opacity group-hover:opacity-100"
                      title="删除知识库"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            className="fixed inset-0" 
            onClick={() => setIsCreateModalOpen(false)}
          />
          <div 
            className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">新建知识库</h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">名称</Label>
                <Input
                  id="name"
                  placeholder="给知识库起个名字"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={isCreating}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">描述 (可选)</Label>
                <Input
                  id="description"
                  placeholder="描述这个知识库的内容"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  disabled={isCreating}
                />
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreating}
                  className="text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || !formData.name.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white min-w-[80px]"
                >
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : '创建'}
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
