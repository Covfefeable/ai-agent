import { useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { AgentCategory } from '@/api/agentCategories';
import { agentsApi } from '@/api/agents';
import { toast } from 'sonner';

const agentSchema = z.object({
  apiKey: z.string().min(1, '请输入 API Key'),
  baseUrl: z.string().optional(),
  isPublic: z.boolean().default(false),
  categoryId: z.string().optional(),
  multiplier: z.coerce.number().min(0, '倍率最小为 0'),
});

type AgentFormValues = z.infer<typeof agentSchema>;

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
  categories: AgentCategory[];
  isLoading?: boolean;
  initialData?: {
    id?: string;
    apiKey?: string;
    baseUrl?: string;
    isPublic?: boolean;
    categoryId?: string | null;
    multiplier?: number;
  };
}

export function AgentModal({ isOpen, onClose, onSuccess, mode, categories, initialData, isLoading }: AgentModalProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema) as unknown as Resolver<AgentFormValues>,
    defaultValues: {
      apiKey: '',
      baseUrl: '',
      isPublic: false,
      categoryId: '',
      multiplier: 1.0,
    },
  });

  useEffect(() => {
    if (isOpen && initialData) {
      reset({
        apiKey: initialData.apiKey || '',
        baseUrl: initialData.baseUrl || '',
        isPublic: !!initialData.isPublic,
        categoryId: initialData.categoryId || '',
        multiplier: initialData.multiplier ?? 1.0,
      });
    } else if (isOpen) {
      reset({ apiKey: '', baseUrl: '', isPublic: false, categoryId: '', multiplier: 1.0 });
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: AgentFormValues) => {
    try {
      if (mode === 'create') {
        await agentsApi.create({
          apiKey: data.apiKey,
          baseUrl: data.baseUrl,
          isPublic: data.isPublic,
          categoryId: data.categoryId || undefined,
          multiplier: data.multiplier,
        });
        toast.success('智能体创建成功');
      } else {
        const id = initialData?.id;
        if (!id) return;
        await agentsApi.update(id, {
          isPublic: data.isPublic,
          baseUrl: data.baseUrl,
          categoryId: data.categoryId || null,
          multiplier: data.multiplier,
          ...(data.apiKey ? { apiKey: data.apiKey } : {}),
        });
        toast.success('智能体更新成功');
      }
      onSuccess();
      onClose();
    } catch {
      toast.error(mode === 'create' ? '创建失败' : '更新失败');
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

        <form onSubmit={handleSubmit(onSubmit)}>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="baseUrl">API Base URL <span className="text-xs text-slate-400 font-normal ml-1">（选填）</span></Label>
                <Input
                  id="baseUrl"
                  placeholder="https://api.dify.ai/v1"
                  disabled={isSubmitting}
                  {...register('baseUrl')}
                />
                <p className="text-xs text-slate-500">请填写您的 Dify 智能体所在的 API Base URL。</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  placeholder="请输入 Dify API Key"
                  disabled={isSubmitting}
                  {...register('apiKey')}
                />
                {errors.apiKey && (
                  <p className="text-xs text-red-500">{errors.apiKey.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">分类</Label>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      options={[{ label: '未分类', value: '' }, ...categories.map(c => ({ label: c.name, value: c.id }))]}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="选择分类"
                      disabled={isSubmitting}
                      className="mt-1 w-full"
                    />
                  )}
                />
                {(JSON.parse(localStorage.getItem('user') || '{}')?.role === 'owner' || JSON.parse(localStorage.getItem('user') || '{}')?.role === 'admin') && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => { window.location.href = '/agent-categories'; }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      分类管理
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="multiplier">倍率</Label>
                <Input
                  id="multiplier"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="最小为 0"
                  disabled={isSubmitting}
                  {...register('multiplier')}
                />
                {errors.multiplier && (
                  <p className="text-xs text-red-500">{errors.multiplier.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="isPublic" className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    id="isPublic"
                    type="checkbox"
                    className="h-4 w-4 rounded-sm border border-slate-300 accent-black"
                    disabled={isSubmitting}
                    {...register('isPublic')}
                  />
                  <span className="text-sm text-slate-700">是否公开</span>
                </label>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" className="bg-black hover:bg-black/80 text-white" disabled={isSubmitting || isLoading}>
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
