import { useEffect, useState, useCallback } from 'react';
import { agentsApi, type Agent } from '@/api/agents';
import { agentCategoriesApi, type AgentCategory } from '@/api/agentCategories';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AgentModal } from '@/components/agents/agent-modal';
import { Pagination } from '@/components/ui/pagination';
import { Trash2, Plus, Search, Pencil } from 'lucide-react';

export function AgentsPage() {
  const getErrMsg = (e: unknown, fallback: string) => {
    const resp = (e as { response?: { data?: { message?: string } } })?.response;
    const msg = resp?.data?.message;
    return typeof msg === 'string' ? msg : fallback;
  };

  const [items, setItems] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;
  
  // 统一弹窗替代原有新增/编辑状态
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  // const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<AgentCategory[]>([]);
  // 统一弹窗替代原有新增/编辑状态
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formApiKey, setFormApiKey] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formIsPublic, setFormIsPublic] = useState(false);
  const [formCategoryId, setFormCategoryId] = useState<string | ''>('');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [agentsRes, catsRes] = await Promise.all([
        agentsApi.list(searchKeyword, currentPage, pageSize),
        agentCategoriesApi.list()
      ]);
      setItems(agentsRes.data);
      setTotalItems(agentsRes.total || agentsRes.data?.length || 0);
      setCategories(catsRes.data);
    } catch (e) {
      toast.error(getErrMsg(e, '获取智能体列表失败'));
    } finally {
      setIsLoading(false);
    }
  }, [searchKeyword, currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when search keyword changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword]);

  // 统一弹窗的提交逻辑由 AgentModal 内部处理

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await agentsApi.remove(deleteId);
      toast.success('已删除');
      setDeleteId(null);
      fetchData();
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex h-16 items-center justify-between border-b border-slate-100 pl-14 pr-4 md:px-8">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800 whitespace-nowrap">智能体管理</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索..."
              className="h-9 w-24 md:w-64 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
              onChange={(e) => {
                const v = e.target.value;
                setSearchKeyword(v);
              }}
              value={searchKeyword}
            />
          </div>
        </div>
        <Button
          onClick={() => {
            setModalMode('create');
            setEditingId(null);
            setFormApiKey('');
            setFormBaseUrl('');
            setFormIsPublic(false);
            setFormCategoryId('');
            setModalOpen(true);
          }}
          className="gap-2 px-3 md:px-4"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">发布智能体</span>
          <span className="md:hidden">发布</span>
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-slate-500">加载中...</div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">标题</th>
                  <th className="px-6 py-4 font-medium">描述</th>
                  <th className="px-6 py-4 font-medium">图标</th>
                  <th className="px-6 py-4 font-medium">分类</th>
                  <th className="px-6 py-4 font-medium">是否公开</th>
                  <th className="px-6 py-4 font-medium">创建时间</th>
                  <th className="px-6 py-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-slate-900">{it.title}</td>
                    <td className="px-6 py-4 text-slate-600 truncate max-w-[320px]">{it.description || '-'}</td>
                    <td className="px-6 py-4">
                      {it.iconUrl ? (
                        <img src={it.iconUrl} alt="" className="h-8 w-8 rounded" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-slate-100" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {it.categoryId
                        ? (categories.find(c => c.id === it.categoryId)?.name || '-')
                        : '-'}
                    </td>
                    <td className="px-6 py-4">{it.isPublic ? '公开' : '私有'}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {it.createdAt ? format(new Date(it.createdAt), 'yyyy-MM-dd HH:mm') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={async () => {
                          setModalMode('edit');
                          setEditingId(it.id);
                          setFormApiKey('');
                          setFormBaseUrl('');
                          setFormIsPublic(!!it.isPublic);
                          setFormCategoryId(it.categoryId || '');
                          setModalOpen(true);
                          try {
                            const res = await agentsApi.get(it.id);
                            setFormApiKey(res.data.apiKey || '');
                            setFormBaseUrl(res.data.baseUrl || '');
                            setFormIsPublic(!!res.data.isPublic);
                            setFormCategoryId(res.data.categoryId || '');
                          } catch {
                            toast.error('获取智能体详情失败');
                          }
                        }}
                        className="ml-2 rounded-lg p-1.5 text-slate-400 hover:bg-black/5 hover:text-black"
                        title="编辑"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(it.id)}
                        className="ml-2 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            </div>
            
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              className="justify-end mt-4"
            />
          </>
        )}
      </div>

      <AgentModal
        isOpen={modalOpen}
        mode={modalMode}
        categories={categories}
        initialData={editingId ? { id: editingId, apiKey: formApiKey, baseUrl: formBaseUrl, isPublic: formIsPublic, categoryId: formCategoryId || '' } : undefined}
        onClose={() => { setModalOpen(false); setEditingId(null); }}
        onSuccess={fetchData}
      />

      {/* 统一弹窗已覆盖新增与编辑 */}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="删除智能体"
        description="确定要删除这个智能体吗？此操作无法撤销。"
        confirmText="删除"
        variant="destructive"
      />
    </div>
  );
}
