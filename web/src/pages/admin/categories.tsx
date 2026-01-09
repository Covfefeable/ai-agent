import { useEffect, useState, useCallback } from 'react';
import { agentCategoriesApi, type AgentCategory } from '@/api/agentCategories';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { CategoryModal } from './category-modal';

import { Search } from 'lucide-react';

export function CategoriesList({ className }: { className?: string }) {
  const [items, setItems] = useState<AgentCategory[]>([]);
  const [filteredItems, setFilteredItems] = useState<AgentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<{ id?: string; name: string; sort: number } | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await agentCategoriesApi.list();
      setItems(res.data);
      setFilteredItems(res.data);
    } catch {
      toast.error('获取分类失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!searchKeyword) {
      setFilteredItems(items);
    } else {
      const lower = searchKeyword.toLowerCase();
      setFilteredItems(items.filter(it => it.name.toLowerCase().includes(lower)));
    }
  }, [searchKeyword, items]);

  const handleSuccess = () => {
    setModalOpen(false);
    setEditing(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    try {
      await agentCategoriesApi.remove(id);
      toast.success('分类已删除');
      fetchData();
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <div className={`flex h-full flex-col bg-white ${className}`}>
      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
        <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索..."
                  className="h-9 w-64 rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  value={searchKeyword}
                />
              </div>
            </div>
            <Button
              onClick={() => {
                setModalMode('create');
                setEditing(null);
                setModalOpen(true);
              }}
              className="gap-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              新增分类
            </Button>
          </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-slate-500">加载中...</div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">名称</th>
                  <th className="px-6 py-4 font-medium">排序</th>
                  <th className="px-6 py-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900">{it.name}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {it.sort}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <>
                        <button
                          onClick={() => {
                            setModalMode('edit');
                            setEditing({ id: it.id, name: it.name, sort: it.sort });
                            setModalOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-black/5 hover:text-black"
                          title="编辑"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(it.id)}
                          className="ml-2 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
      <CategoryModal
        isOpen={modalOpen}
        mode={modalMode}
        initialData={editing || undefined}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

export function AgentCategoriesPage() {
  return <CategoriesList />;
}
