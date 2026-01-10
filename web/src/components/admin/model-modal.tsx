import { useEffect, useRef } from 'react';
import { modelsApi } from '@/api/models';
import { toast } from 'sonner';
import { X, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const modelSchema = z.object({
  name: z.string().min(1, '请输入模型名称'),
  modelId: z.string().min(1, '请输入模型ID'),
  sort: z.coerce.number().default(0),
  enabled: z.boolean().default(true),
  iconUrl: z.string().min(1, '请上传模型Logo'),
  multiplier: z.coerce.number().min(0, '倍率最小为 0').default(1.0),
});

type ModelFormValues = z.infer<typeof modelSchema>;

interface ModelModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: {
    id: string;
    name: string;
    modelId: string;
    sort: number;
    enabled: boolean;
    iconUrl: string | null;
    multiplier: number;
  };
  onClose: () => void;
  onSuccess: () => void;
  isLoading?: boolean;
}

export function ModelModal({ isOpen, mode, initialData, onClose, onSuccess, isLoading: isFetchingDetail }: ModelModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ModelFormValues>({
    resolver: zodResolver(modelSchema) as Resolver<ModelFormValues>,
    defaultValues: {
      name: '',
      modelId: '',
      sort: 0,
      enabled: true,
      iconUrl: '',
      multiplier: 1.0,
    },
  });

  useEffect(() => {
    if (isOpen && initialData) {
      reset({
        name: initialData.name,
        modelId: initialData.modelId,
        sort: initialData.sort,
        enabled: initialData.enabled,
        iconUrl: initialData.iconUrl || '',
        multiplier: initialData.multiplier ?? 1.0,
      });
    } else if (isOpen) {
      reset({
        name: '',
        modelId: '',
        sort: 0,
        enabled: true,
        iconUrl: '',
        multiplier: 1.0,
      });
    }
  }, [isOpen, initialData, reset]);

  const iconUrl = watch('iconUrl');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (e.g., limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片大小不能超过 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setValue('iconUrl', base64, { shouldValidate: true });
    };
    reader.onerror = () => {
      toast.error('读取图片失败');
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: ModelFormValues) => {
    try {
      if (mode === 'create') {
        await modelsApi.create(data);
        toast.success('模型创建成功');
      } else if (initialData?.id) {
        await modelsApi.update(initialData.id, data);
        toast.success('模型更新成功');
      }
      onSuccess();
      onClose();
    } catch (e) {
      const resp = (e as { response?: { data?: { message?: string } } })?.response;
      toast.error(resp?.data?.message || (mode === 'create' ? '创建失败' : '更新失败'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            {mode === 'create' ? '新建模型' : '编辑模型'}
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {isFetchingDetail ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">模型名称</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="例如：GPT-4"
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelId">模型ID</Label>
                <Input
                  id="modelId"
                  {...register('modelId')}
                  placeholder="例如：gpt-4"
                  disabled={isSubmitting}
                />
                {errors.modelId && (
                  <p className="text-xs text-red-500">{errors.modelId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort">排序</Label>
                <Input
                  id="sort"
                  type="number"
                  {...register('sort')}
                  placeholder="数字越小越靠前"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="multiplier">倍率</Label>
                <Input
                  id="multiplier"
                  type="number"
                  step="0.1"
                  min="0"
                  {...register('multiplier')}
                  placeholder="最小为 0"
                  disabled={isSubmitting}
                />
                {errors.multiplier && (
                  <p className="text-xs text-red-500">{errors.multiplier.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>模型Logo</Label>
                <div className="flex flex-col gap-2">
                  <div 
                    onClick={() => !isSubmitting && fileInputRef.current?.click()}
                    className={`relative flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition-all hover:border-slate-400 hover:bg-slate-100 ${isSubmitting ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    {iconUrl ? (
                      <>
                        <img 
                          src={iconUrl} 
                          alt="Logo Preview" 
                          className="h-full w-full rounded-xl object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                          <span className="text-xs font-medium text-white">更换图片</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Plus className="h-6 w-6 text-slate-400" />
                        <span className="text-xs text-slate-400">上传图片</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                  />
                  <span className="text-xs text-slate-500">支持 PNG, JPG, GIF (Max 2MB)</span>
                  {errors.iconUrl && (
                    <p className="text-xs text-red-500">{errors.iconUrl.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="enabled" className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="enabled"
                    {...register('enabled')}
                    className="h-4 w-4 rounded-sm border border-slate-300 accent-black"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-slate-700">启用</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-black text-white hover:bg-black/90"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === 'create' ? '创建' : '保存'}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
