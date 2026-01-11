import { useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { knowledgeApi } from '@/api/knowledge';
import { toast } from 'sonner';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const knowledgeBaseSchema = z.object({
  name: z.string().min(1, '请输入知识库名称'),
  description: z.string().optional(),
});

type KnowledgeBaseFormValues = z.infer<typeof knowledgeBaseSchema>;

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
  initialData?: {
    id?: string;
    name: string;
    description: string;
  };
}

export function KnowledgeBaseModal({ isOpen, onClose, onSuccess, mode, initialData }: KnowledgeBaseModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<KnowledgeBaseFormValues>({
    resolver: zodResolver(knowledgeBaseSchema) as Resolver<KnowledgeBaseFormValues>,
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (isOpen && initialData) {
      reset({
        name: initialData.name || '',
        description: initialData.description || '',
      });
    } else {
      reset({ name: '', description: '' });
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: KnowledgeBaseFormValues) => {
    try {
      if (mode === 'create') {
        await knowledgeApi.createDataset({
          name: data.name,
          description: data.description || '',
        });
        toast.success('知识库创建成功');
      } else {
        if (initialData?.id) {
          await knowledgeApi.updateDataset(initialData.id, {
            name: data.name,
            description: data.description || '',
          });
          toast.success('知识库更新成功');
        }
      }
      
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Failed to ${mode} knowledge base:`, msg);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      <div 
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            {mode === 'create' ? '新建知识库' : '编辑知识库'}
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="请输入知识库名称"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                {...register('description')}
                placeholder="请输入知识库描述"
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="text-xs text-red-500">{errors.description.message}</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
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
              className="bg-black hover:bg-black/80 text-white"
              disabled={isSubmitting}
            >
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
