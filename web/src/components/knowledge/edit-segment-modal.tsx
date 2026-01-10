import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { knowledgeApi, type Segment } from '@/api/knowledge';
import { toast } from 'sonner';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const segmentSchema = z.object({
  content: z.string().min(1, '内容不能为空'),
  keywords: z.array(z.string()).default([]),
});

type SegmentFormValues = z.infer<typeof segmentSchema>;

interface EditSegmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  datasetId: string;
  documentId: string;
  segment: Segment;
}

export function EditSegmentModal({ isOpen, onClose, onSuccess, datasetId, documentId, segment }: EditSegmentModalProps) {
  const [newKeyword, setNewKeyword] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SegmentFormValues>({
    resolver: zodResolver(segmentSchema) as Resolver<SegmentFormValues>,
    defaultValues: {
      content: segment.content,
      keywords: segment.keywords || [],
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        content: segment.content,
        keywords: segment.keywords || [],
      });
      setNewKeyword('');
    }
  }, [isOpen, segment, reset]);

  const keywords = watch('keywords');

  if (!isOpen) return null;

  const onSubmit = async (data: SegmentFormValues) => {
    try {
      await knowledgeApi.updateSegment(datasetId, documentId, segment.id, {
        content: data.content,
        keywords: data.keywords,
      });
      toast.success('更新成功');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Update segment failed:', error);
      toast.error('更新失败');
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setValue('keywords', [...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    setValue('keywords', keywords.filter(k => k !== keywordToRemove));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div 
        className="relative w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">编辑分段</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-slate-500">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">内容</label>
              <textarea
                {...register('content')}
                className="w-full min-h-[200px] rounded-lg border border-slate-200 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="分段内容..."
              />
              {errors.content && (
                <p className="text-xs text-red-500">{errors.content.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">关键词</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="输入关键词并回车..."
                />
                <Button type="button" onClick={addKeyword} variant="outline" className="shrink-0">
                  添加
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map((keyword, index) => (
                  <span key={index} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {keyword}
                    <button type="button" onClick={() => removeKeyword(keyword)} className="ml-1 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>取消</Button>
            <Button type="submit" isLoading={isSubmitting} className="bg-black hover:bg-black/80 text-white">保存</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
