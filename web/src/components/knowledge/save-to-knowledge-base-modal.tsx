import { useEffect, useMemo } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { knowledgeApi, type Dataset } from '@/api/knowledge';
import { useForm, type Resolver, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const saveToKnowledgeBaseSchema = z.object({
  name: z.string().min(1, '请输入文档名称'),
  datasetId: z.string().min(1, '请选择知识库'),
  separator: z.string().default('\\n\\n\\n'),
  maxTokens: z.coerce.number().int().min(128, '最大分段长度不能小于 128').default(1024),
});

type SaveToKnowledgeBaseFormValues = z.infer<typeof saveToKnowledgeBaseSchema>;

interface SaveToKnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  knowledgeBases: Dataset[];
  text: string;
  defaultName?: string;
  defaultDatasetId?: string;
}

export function SaveToKnowledgeBaseModal({
  isOpen,
  onClose,
  knowledgeBases,
  text,
  defaultName,
  defaultDatasetId,
}: SaveToKnowledgeBaseModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SaveToKnowledgeBaseFormValues>({
    resolver: zodResolver(saveToKnowledgeBaseSchema) as Resolver<SaveToKnowledgeBaseFormValues>,
    defaultValues: {
      name: '',
      datasetId: '',
      separator: '\\n\\n\\n',
      maxTokens: 1024,
    },
  });

  const datasetId = useWatch<SaveToKnowledgeBaseFormValues>({ control, name: 'datasetId' }) as string;
  const submitting = isSubmitting;

  const options = useMemo(
    () => knowledgeBases.map((kb) => ({ label: kb.name, value: kb.id })),
    [knowledgeBases]
  );

  useEffect(() => {
    if (!isOpen) return;

    reset({
      name: defaultName || '',
      datasetId: defaultDatasetId || knowledgeBases[0]?.id || '',
      separator: '\\n\\n\\n',
      maxTokens: 1024,
    });
  }, [isOpen, defaultName, defaultDatasetId, knowledgeBases, reset]);

  const close = () => {
    if (submitting) return;
    onClose();
  };

  const onSubmit = async (data: SaveToKnowledgeBaseFormValues) => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      toast.error('内容为空，无法保存');
      return;
    }

    try {
      const actualSeparator = data.separator.replace(/\\n/g, '\n');
      await knowledgeApi.createDocumentByText(data.datasetId, {
        name: data.name.trim(),
        text,
        separator: actualSeparator,
        max_tokens: data.maxTokens,
      });
      toast.success('已保存到知识库');
      onClose();
    } catch (e) {
      console.error('Save to knowledge base failed:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={close} />
      <div
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">保存到知识库</h3>
          <button
            type="button"
            onClick={close}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="save-kb-name">文档名称</Label>
              <Input
                id="save-kb-name"
                {...register('name')}
                placeholder="请输入文档名称"
                disabled={submitting}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="save-kb-dataset">选择知识库</Label>
              <Select
                options={options}
                value={datasetId}
                onChange={(nextValue) =>
                  setValue('datasetId', nextValue, { shouldDirty: true, shouldValidate: true })
                }
                placeholder={knowledgeBases.length === 0 ? '暂无知识库' : '请选择知识库'}
                disabled={submitting || knowledgeBases.length === 0}
              />
              {errors.datasetId && (
                <p className="text-xs text-red-500">{errors.datasetId.message}</p>
              )}
              {knowledgeBases.length === 0 && (
                <p className="text-xs text-slate-500">请先在「知识库」页面创建知识库</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="save-kb-separator">分段标识符</Label>
                <Input
                  id="save-kb-separator"
                  {...register('separator')}
                  placeholder="\\n\\n\\n"
                  disabled={submitting}
                />
                {errors.separator && (
                  <p className="text-xs text-red-500">{errors.separator.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="save-kb-maxTokens">最大分段长度</Label>
                <Input
                  id="save-kb-maxTokens"
                  type="number"
                  {...register('maxTokens')}
                  disabled={submitting}
                />
                {errors.maxTokens && (
                  <p className="text-xs text-red-500">{errors.maxTokens.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={close} disabled={submitting}>
              取消
            </Button>
            <Button
              type="submit"
              className="bg-black hover:bg-black/80 text-white"
              disabled={submitting || knowledgeBases.length === 0}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
