import { Modal } from 'antd';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { agentCategoriesApi } from '@/api/agentCategories';
import { toast } from 'sonner';

const categorySchema = z.object({
  name: z.string().min(1, '请输入分类名称'),
  sort: z.coerce.number().default(0),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema) as Resolver<CategoryFormValues>,
    defaultValues: {
      name: '',
      sort: 0,
    },
  });

  useEffect(() => {
    if (isOpen && initialData) {
      reset({ name: initialData.name || '', sort: initialData.sort || 0 });
    } else if (isOpen) {
      reset({ name: '', sort: 0 });
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      if (mode === 'create') {
        await agentCategoriesApi.create(data.name.trim(), data.sort);
        toast.success('分类创建成功');
      } else {
        const id = initialData?.id;
        if (!id) return;
        await agentCategoriesApi.update(id, data.name.trim(), data.sort);
        toast.success('分类更新成功');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error(mode === 'create' ? 'Create category failed' : 'Update category failed', error);
    }
  };

  return (
    <Modal
      title={mode === 'create' ? '新建分类' : '编辑分类'}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={448}
      centered
    >
      <form onSubmit={handleSubmit(onSubmit)} className="pt-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">名称</Label>
            <Input
              id="name"
              placeholder="请输入分类名称"
              disabled={isSubmitting}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sort">排序</Label>
            <Input
              id="sort"
              type="number"
              disabled={isSubmitting}
              {...register('sort')}
            />
            {errors.sort && (
              <p className="text-xs text-red-500">{errors.sort.message}</p>
            )}
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
    </Modal>
  );
}
