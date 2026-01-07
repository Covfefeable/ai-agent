import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AgentCategory } from '@/api/agentCategories';
import { agentsApi } from '@/api/agents';
import { toast } from 'sonner';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
  categories: AgentCategory[];
  initialData?: {
    id?: string;
    apiKey?: string;
    isPublic?: boolean;
    categoryId?: string | null;
  };
}

export function AgentModal({ isOpen, onClose, onSuccess, mode, categories, initialData }: AgentModalProps) {
  const [formData, setFormData] = useState<{ apiKey: string; isPublic: boolean; categoryId: string | '' }>({
    apiKey: '',
    isPublic: false,
    categoryId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        apiKey: initialData.apiKey || '',
        isPublic: !!initialData.isPublic,
        categoryId: initialData.categoryId || '',
      });
    } else if (isOpen) {
      setFormData({ apiKey: '', isPublic: false, categoryId: '' });
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (mode === 'create') {
        if (!formData.apiKey.trim()) return;
        await agentsApi.create({
          apiKey: formData.apiKey,
          isPublic: formData.isPublic,
          categoryId: formData.categoryId || undefined,
        });
        toast.success('智能体创建成功');
      } else {
        const id = initialData?.id;
        if (!id) return;
        await agentsApi.update(id, {
          isPublic: formData.isPublic,
          categoryId: formData.categoryId || null,
          ...(formData.apiKey ? { apiKey: formData.apiKey } : {}),
        });
        toast.success('智能体更新成功');
      }
      onSuccess();
      onClose();
    } catch {
      toast.error(mode === 'create' ? '创建失败' : '更新失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            {mode === 'create' ? '新建智能体' : '编辑智能体'}
          </h3>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="请输入 Dify API Key"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">分类</Label>
              <select
                id="category"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                <option value="">未分类</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => { window.location.href = '/agent-categories'; }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  分类管理
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="isPublic" className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  id="isPublic"
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  disabled={isSubmitting}
                  className="h-4 w-4 rounded-sm border border-slate-300 accent-black"
                />
                <span className="text-sm text-slate-700">是否公开</span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" className="bg-black hover:bg-black/80 text-white" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'create' ? '创建中...' : '保存中...'}
                </>
              ) : (
                mode === 'create' ? '立即创建' : '保存修改'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
