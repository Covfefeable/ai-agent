import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { agentCategoriesApi } from '@/api/agentCategories';
import { toast } from 'sonner';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
  initialData?: {
    id?: string;
    name: string;
    sort?: number;
  };
}

export function CategoryModal({ isOpen, onClose, onSuccess, mode, initialData }: CategoryModalProps) {
  const [formData, setFormData] = useState<{ name: string; sort: number }>({ name: '', sort: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({ name: initialData.name || '', sort: initialData.sort || 0 });
    } else if (isOpen) {
      setFormData({ name: '', sort: 0 });
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    try {
      setIsSubmitting(true);
      if (mode === 'create') {
        await agentCategoriesApi.create(formData.name.trim(), formData.sort);
        toast.success('分类创建成功');
      } else {
        const id = initialData?.id;
        if (!id) return;
        await agentCategoriesApi.update(id, formData.name.trim(), formData.sort);
        toast.success('分类更新成功');
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
            {mode === 'create' ? '新建分类' : '编辑分类'}
          </h3>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
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
                placeholder="请输入分类名称"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort">排序 (数字越小越靠前)</Label>
              <Input
                id="sort"
                type="number"
                value={formData.sort}
                onChange={(e) => setFormData({ ...formData, sort: parseInt(e.target.value) || 0 })}
                disabled={isSubmitting}
              />
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
