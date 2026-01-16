import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Plus, Loader2, Calendar, Trash2, Pencil, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { KnowledgeBaseModal } from '@/components/knowledge/knowledge-base-modal';
import { Pagination } from '@/components/ui/pagination';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { knowledgeApi } from '@/api/knowledge';
import { useDebounce } from '@/hooks/use-debounce';

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
  const [currentKb, setCurrentKb] = useState<KnowledgeBase | undefined>(undefined);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const debouncedKeyword = useDebounce(searchKeyword, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 12;

  const fetchKnowledgeBases = async () => {
    try {
      setIsLoading(true);
      const response = await knowledgeApi.getDatasets(debouncedKeyword, currentPage, pageSize);
      setKnowledgeBases(response.data);
      setTotalItems(response.total);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Failed to fetch knowledge bases:', msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedKeyword]);

  useEffect(() => {
    fetchKnowledgeBases();
  }, [debouncedKeyword, currentPage]);

  const openCreateModal = () => {
    setModalMode('create');
    setCurrentKb(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (kb: KnowledgeBase) => {
    setModalMode('edit');
    setCurrentKb(kb);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await knowledgeApi.deleteDataset(deleteId);
      setKnowledgeBases(prev => prev.filter(kb => kb.id !== deleteId));
      setDeleteId(null);
      toast.success('知识库删除成功');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Failed to delete knowledge base:', msg);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-slate-100 pl-14 pr-4 md:px-8">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800 whitespace-nowrap">知识库</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索知识库..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="h-9 w-32 md:w-64 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
        <Button 
          onClick={openCreateModal}
          className="gap-2 bg-black hover:bg-black/80 text-white shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">新建知识库</span>
          <span className="md:hidden">新建</span>
        </Button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : knowledgeBases.length > 0 ? (
          <div className="flex flex-col gap-6">
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
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-black/5 hover:text-black"
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
                    <span>{dayjs(kb.createdAt).format('YYYY-MM-DD')}</span>
                  </div>
                </div>
              </div>
            ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              className="mt-4 justify-end"
            />
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

      <KnowledgeBaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchKnowledgeBases}
        mode={modalMode}
        initialData={currentKb}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="删除知识库"
        description="确定要删除这个知识库吗？此操作无法撤销，知识库内的所有数据将被永久删除。"
        variant="destructive"
      />
    </div>
  );
}
