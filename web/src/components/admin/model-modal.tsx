import { Modal } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { modelsApi } from '@/api/models';
import { userGroupsApi, type UserGroup } from '@/api/user-groups';
import { toast } from 'sonner';
import { Loader2, Plus, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';

const modelSchema = z.object({
  name: z.string().min(1, '请输入模型名称'),
  modelId: z.string().min(1, '请输入模型ID'),
  sort: z.coerce.number().default(0),
  enabled: z.boolean().default(true),
  iconUrl: z.string().min(1, '请上传模型Logo'),
  multiplier: z.coerce.number().min(0, '倍率最小为 0').default(1.0),
  visibility: z.enum(['public', 'private', 'selected_groups']).default('public'),
  groupIds: z.array(z.string()).optional(),
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
    visibility?: 'public' | 'private' | 'selected_groups';
    groupIds?: string[];
  };
  onClose: () => void;
  onSuccess: () => void;
  isLoading?: boolean;
}

export function ModelModal({ isOpen, mode, initialData, onClose, onSuccess, isLoading: isFetchingDetail }: ModelModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [availableGroups, setAvailableGroups] = useState<UserGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [debouncedGroupSearch, setDebouncedGroupSearch] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    control,
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
      visibility: 'public',
      groupIds: [],
    },
  });

  const visibility = useWatch({ control, name: 'visibility' });
  const selectedGroupIds = useWatch({ control, name: 'groupIds' }) || [];

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedGroupSearch(groupSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [groupSearch]);

  useEffect(() => {
    if (isOpen) {
      setLoadingGroups(true);
      userGroupsApi.list(1, 100, debouncedGroupSearch)
        .then(res => setAvailableGroups(res.data))
        .catch((e) => console.error('Get user groups failed', e))
        .finally(() => setLoadingGroups(false));
    }
  }, [isOpen, debouncedGroupSearch]);

  useEffect(() => {
    if (isOpen && initialData) {
      reset({
        name: initialData.name,
        modelId: initialData.modelId,
        sort: initialData.sort,
        enabled: initialData.enabled,
        iconUrl: initialData.iconUrl || '',
        multiplier: initialData.multiplier ?? 1.0,
        visibility: initialData.visibility || 'public',
        groupIds: initialData.groupIds || [],
      });
    } else if (isOpen) {
      reset({
        name: '',
        modelId: '',
        sort: 0,
        enabled: true,
        iconUrl: '',
        multiplier: 1.0,
        visibility: 'public',
        groupIds: [],
      });
    }
  }, [isOpen, initialData, reset]);

  useEffect(() => {
    if (!isOpen) {
      setGroupSearch('');
      setDebouncedGroupSearch('');
    }
  }, [isOpen]);

  const toggleGroup = (groupId: string) => {
    const current = selectedGroupIds;
    if (current.includes(groupId)) {
      setValue('groupIds', current.filter(id => id !== groupId));
    } else {
      setValue('groupIds', [...current, groupId]);
    }
  };

  const iconUrl = useWatch({ control, name: 'iconUrl' });

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
      console.error(mode === 'create' ? 'Create model failed' : 'Update model failed', e);
    }
  };

  return (
    <Modal
      title={mode === 'create' ? '新建模型' : '编辑模型'}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={448}
      centered
    >
      {isFetchingDetail ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="pt-4 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto max-h-[60vh] pr-2">
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>可见范围</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="public"
                      {...register('visibility')}
                      className="h-4 w-4 border-slate-300 accent-black"
                    />
                    <span className="text-sm text-slate-700">公开</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="private"
                      {...register('visibility')}
                      className="h-4 w-4 border-slate-300 accent-black"
                    />
                    <span className="text-sm text-slate-700">私有</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="selected_groups"
                      {...register('visibility')}
                      className="h-4 w-4 border-slate-300 accent-black"
                    />
                    <span className="text-sm text-slate-700">指定用户组可见</span>
                  </label>
                </div>

                {visibility === 'selected_groups' && (
                  <div className="mt-2 rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs font-medium text-slate-500">选择用户组</div>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={groupSearch}
                          onChange={(e) => setGroupSearch(e.target.value)}
                          placeholder="搜索用户组..."
                          className="h-7 w-40 rounded-md border border-slate-200 bg-slate-50 pl-7 pr-2 text-xs outline-none focus:border-black focus:ring-1 focus:ring-black"
                        />
                      </div>
                    </div>
                    {loadingGroups ? (
                      <div className="py-4 text-center text-sm text-slate-400">加载中...</div>
                    ) : availableGroups.length === 0 ? (
                      <div className="py-4 text-center text-sm text-slate-400">暂无用户组</div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {availableGroups.map(group => (
                          <div
                            key={group.id}
                            onClick={() => toggleGroup(group.id)}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50"
                          >
                            <div className={cn(
                              "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                              selectedGroupIds.includes(group.id)
                                ? "border-black bg-black text-white"
                                : "border-slate-300 bg-white"
                            )}>
                              {selectedGroupIds.includes(group.id) && <Check className="h-3 w-3" />}
                            </div>
                            <span className="text-sm text-slate-700">{group.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

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
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-100">
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
        </form>
      )}
    </Modal>
  );
}
