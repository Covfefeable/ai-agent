import { useEffect } from 'react';
import { userGroupsApi } from '@/api/user-groups';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const groupSchema = z.object({
  name: z.string().min(1, '请输入用户组名称'),
});

type GroupFormValues = z.infer<typeof groupSchema>;

interface UserGroupModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: {
    id: string;
    name: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function UserGroupModal({ isOpen, mode, initialData, onClose, onSuccess }: UserGroupModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (isOpen && initialData) {
      reset({
        name: initialData.name,
      });
    } else if (isOpen) {
      reset({
        name: '',
      });
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: GroupFormValues) => {
    try {
      if (mode === 'create') {
        await userGroupsApi.create(data);
        toast.success('创建用户组成功');
      } else if (mode === 'edit' && initialData) {
        await userGroupsApi.update(initialData.id, data);
        toast.success('更新用户组成功');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Submit User Group Error:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            {mode === 'create' ? '新建用户组' : '编辑用户组'}
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">用户组名称</Label>
              <Input
                id="name"
                placeholder="请输入用户组名称"
                {...register('name')}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-black text-white hover:bg-black/90">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? '创建' : '保存'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
