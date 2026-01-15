import { Modal } from 'antd';
import { useEffect } from 'react';
import { Loader2, Lock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { userApi } from '@/api/user';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z.string().min(6, '新密码长度不能少于6位'),
  confirmPassword: z.string().min(6, '请再次输入新密码'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema) as Resolver<ChangePasswordFormValues>,
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: ChangePasswordFormValues) => {
    try {
      await userApi.updatePassword({
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });
      toast.success('密码修改成功');
      onClose();
    } catch (error: unknown) {
      console.error(error);
    }
  };

  return (
    <Modal
      title="修改密码"
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={448}
      centered
    >
      <form onSubmit={handleSubmit(onSubmit)} className="pt-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">当前密码</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 z-10" />
            <Input
              type="password"
              {...register('oldPassword')}
              className="pl-9"
              placeholder="请输入当前使用的密码"
            />
          </div>
          {errors.oldPassword && (
            <p className="text-xs text-red-500">{errors.oldPassword.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">新密码</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 z-10" />
            <Input
              type="password"
              {...register('newPassword')}
              className="pl-9"
              placeholder="请输入新密码（至少6位）"
            />
          </div>
          {errors.newPassword && (
            <p className="text-xs text-red-500">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">确认新密码</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 z-10" />
            <Input
              type="password"
              {...register('confirmPassword')}
              className="pl-9"
              placeholder="请再次输入新密码"
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                确认修改
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
