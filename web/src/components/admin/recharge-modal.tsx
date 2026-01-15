import { Modal } from 'antd';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usersApi } from '@/api/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const rechargeSchema = z.object({
  amount: z.coerce.number().min(1, '请输入有效的正整数金额').int('请输入整数'),
});

type RechargeFormValues = z.infer<typeof rechargeSchema>;

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  userName: string;
}

export function RechargeModal({ isOpen, onClose, onSuccess, userId, userName }: RechargeModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RechargeFormValues>({
    resolver: zodResolver(rechargeSchema) as unknown as Resolver<RechargeFormValues>,
    defaultValues: {
      amount: 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ amount: undefined });
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: RechargeFormValues) => {
    try {
      await usersApi.rechargeUser(userId, data.amount);
      toast.success('充值成功');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Recharge failed:', msg);
    }
  };

  return (
    <Modal
      title="给用户充值"
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={448}
      centered
    >
      <div className="pt-4">
        <div className="mb-4 text-sm text-slate-600">
          正在为用户 <span className="font-bold text-slate-900">{userName}</span> 充值
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">充值数额 (Token)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="1"
                placeholder="请输入充值数额"
                disabled={isSubmitting}
                autoFocus
                {...register('amount')}
              />
              {errors.amount && (
                <p className="text-xs text-red-500">{errors.amount.message}</p>
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
                  充值中...
                </>
              ) : (
                '确认充值'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
