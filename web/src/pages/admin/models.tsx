import { useEffect, useState, useCallback } from 'react';
import { modelsApi, type Model } from '@/api/models';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ModelModal } from '@/components/admin/model-modal';
import { Pagination } from '@/components/ui/pagination';
import { Trash2, Plus, Search, Pencil } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { Popover } from 'antd';


export function ModelsList({ className }: { className?: string }) {
  const [items, setItems] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const debouncedSearchKeyword = useDebounce(searchKeyword, 500);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingData, setEditingData] = useState<Model | undefined>(undefined);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await modelsApi.list(debouncedSearchKeyword, currentPage, pageSize);
      setItems(res.data);
      setTotalItems(res.total || res.data?.length || 0);
    } catch (e) {
      console.error('Get models list failed', e);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchKeyword, currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when search keyword changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchKeyword]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await modelsApi.remove(deleteId);
      toast.success('已删除');
      setDeleteId(null);
      fetchData();
    } catch (e) {
      console.error('Remove model failed', e);
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
                setEditingData(undefined);
                setModalOpen(true);
              }}
              className="gap-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              添加模型
            </Button>
          </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-slate-500">加载中...</div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Logo</th>
                  <th className="px-6 py-4 font-medium">模型名称</th>
                  <th className="px-6 py-4 font-medium">模型ID</th>
                  <th className="px-6 py-4 font-medium">倍率</th>
                  <th className="px-6 py-4 font-medium">排序</th>
                  <th className="px-6 py-4 font-medium">可见范围</th>
                  <th className="px-6 py-4 font-medium">是否启用</th>
                  <th className="px-6 py-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      {it.iconUrl ? (
                        <img src={it.iconUrl} alt="" className="h-8 w-8 rounded object-contain" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-slate-100" />
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{it.name}</td>
                    <td className="px-6 py-4 text-slate-600">{it.modelId}</td>
                    <td className="px-6 py-4 text-slate-600">{it.multiplier ?? 1.0}</td>
                    <td className="px-6 py-4 text-slate-600">{it.sort}</td>
                    <td className="px-6 py-4">
                      {it.visibility === 'public' ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">公开</span>
                      ) : it.visibility === 'private' ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">私有</span>
                      ) : (
                        <Popover
                          content={
                            <div className="flex flex-wrap gap-1 max-w-[300px]">
                              {it.groups?.split(',').map((group, idx) => (
                                <span key={idx} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                  {group}
                                </span>
                              ))}
                            </div>
                          }
                        >
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 cursor-default">
                            指定用户组 ({it.groups ? it.groups.split(',').length : 0})
                          </span>
                        </Popover>
                      )}
                    </td>
                    <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${it.enabled ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                            {it.enabled ? '已启用' : '已禁用'}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={async () => {
                          setModalMode('edit');
                          setEditingData(undefined); // 先清空，避免显示旧数据
                          setIsFetchingDetail(true);
                          setModalOpen(true);
                          try {
                            const res = await modelsApi.get(it.id);
                            setEditingData({
                                ...res.data,
                                iconUrl: res.data.iconUrl || ''
                            });
                          } catch (e) {
                            console.error('Get model detail failed', e);
                            setModalOpen(false); // 获取失败关闭弹窗
                          } finally {
                            setIsFetchingDetail(false);
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

      <ModelModal
        isOpen={modalOpen}
        mode={modalMode}
        initialData={editingData}
        onClose={() => { setModalOpen(false); setEditingData(undefined); }}
        onSuccess={fetchData}
        isLoading={isFetchingDetail}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="删除模型"
        description="确定要删除这个模型吗？此操作无法撤销。"
        confirmText="删除"
        variant="destructive"
      />
    </div>
  );
}

export function ModelsPage() {
  return <ModelsList />;
}
