import { useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
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
    resolver: zodResolver(rechargeSchema) as any,
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
      toast.error('充值失败');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            给用户充值
          </h3>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

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
    </div>
  );
}
