import { Modal } from 'antd';
import { useEffect, useState } from 'react';
import { Loader2, Check, Search } from 'lucide-react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { AgentCategory } from '@/api/agentCategories';
import { agentsApi, type AgentDetail } from '@/api/agents';
import { userGroupsApi, type UserGroup } from '@/api/user-groups';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const agentSchema = z.object({
  apiKey: z.string().min(1, '请输入 API Key'),
  baseUrl: z.string().optional(),
  visibility: z.enum(['public', 'private', 'selected_groups']).default('public'),
  groupIds: z.array(z.string()).optional(),
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
  initialData?: Partial<AgentDetail>;
}

export function AgentModal({ isOpen, onClose, onSuccess, mode, categories, initialData, isLoading }: AgentModalProps) {
  const [availableGroups, setAvailableGroups] = useState<UserGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [debouncedGroupSearch, setDebouncedGroupSearch] = useState('');

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema) as unknown as Resolver<AgentFormValues>,
    defaultValues: {
      apiKey: '',
      baseUrl: '',
      visibility: 'public',
      groupIds: [],
      categoryId: '',
      multiplier: 1.0,
    },
  });

  const visibility = watch('visibility');
  const selectedGroupIds = watch('groupIds') || [];

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
        .catch(() => console.error('获取用户组列表失败'))
        .finally(() => setLoadingGroups(false));
    }
  }, [isOpen, debouncedGroupSearch]);

  useEffect(() => {
    if (isOpen && initialData) {
      reset({
        apiKey: initialData.apiKey || '',
        baseUrl: initialData.baseUrl || '',
        visibility: initialData.visibility || 'public',
        groupIds: initialData.groupIds || [],
        categoryId: initialData.categoryId || '',
        multiplier: initialData.multiplier ?? 1.0,
      });
    } else if (isOpen) {
      reset({ apiKey: '', baseUrl: '', visibility: 'public', groupIds: [], categoryId: '', multiplier: 1.0 });
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

  const onSubmit = async (data: AgentFormValues) => {
    try {
      if (mode === 'create') {
        await agentsApi.create({
          apiKey: data.apiKey,
          baseUrl: data.baseUrl,
          visibility: data.visibility,
          groupIds: data.groupIds,
          categoryId: data.categoryId || undefined,
          multiplier: data.multiplier,
        });
        toast.success('智能体创建成功');
      } else {
        const id = initialData?.id;
        if (!id) return;
        await agentsApi.update(id, {
          visibility: data.visibility,
          groupIds: data.groupIds,
          baseUrl: data.baseUrl,
          categoryId: data.categoryId || null,
          multiplier: data.multiplier,
          ...(data.apiKey ? { apiKey: data.apiKey } : {}),
        });
        toast.success('智能体更新成功');
      }
      onSuccess();
      onClose();
    } catch (error) {
      // 错误已由全局拦截器处理
      console.error(mode === 'create' ? 'Create agent failed' : 'Update agent failed', error);
    }
  };

  return (
    <Modal
      title={mode === 'create' ? '新建智能体' : '编辑智能体'}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={448}
      centered
    >
      <form onSubmit={handleSubmit(onSubmit)} className="pt-4 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto max-h-[60vh] pr-2">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
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
                      disabled={isSubmitting}
                    />
                    <span className="text-sm text-slate-700">公开</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="private"
                      {...register('visibility')}
                      className="h-4 w-4 border-slate-300 accent-black"
                      disabled={isSubmitting}
                    />
                    <span className="text-sm text-slate-700">私有</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="selected_groups"
                      {...register('visibility')}
                      className="h-4 w-4 border-slate-300 accent-black"
                      disabled={isSubmitting}
                    />
                    <span className="text-sm text-slate-700">指定用户组</span>
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
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
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
    </Modal>
  );
}
