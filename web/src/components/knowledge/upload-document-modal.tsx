import { Modal } from 'antd';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { knowledgeApi } from '@/api/knowledge';
import { toast } from 'sonner';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const uploadSchema = z.object({
  file: z.instanceof(File, { message: '请选择文件' }),
  separator: z.string().default('\\n\\n\\n'),
  maxTokens: z.coerce.number().min(128, '最小 Token 数不能少于 128').default(1024),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  datasetId: string;
}

export function UploadDocumentModal({ isOpen, onClose, onSuccess, datasetId }: UploadDocumentModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema) as Resolver<UploadFormValues>,
    defaultValues: {
      separator: '\\n\\n\\n',
      maxTokens: 1024,
    },
  });

  const uploadFile = useWatch<UploadFormValues>({ control, name: 'file' }) as File | undefined;

  const onSubmit = async (data: UploadFormValues) => {
    if (!datasetId) return;

    try {
      const actualSeparator = data.separator.replace(/\\n/g, '\n');

      await knowledgeApi.uploadDocument(datasetId, data.file, {
        separator: actualSeparator,
        max_tokens: data.maxTokens,
      });
      
      toast.success('文档上传成功');
      reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <Modal
      title="上传文档"
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={448}
      centered
    >
      <form onSubmit={handleSubmit(onSubmit)} className="pt-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">选择文件</Label>
            <div className="flex items-center justify-center w-full">
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-slate-500" />
                  <p className="mb-2 text-sm text-slate-500">
                    {uploadFile ? uploadFile.name : '点击选择文件'}
                  </p>
                </div>
                <input 
                  id="file-upload" 
                  type="file" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setValue('file', file, { shouldValidate: true });
                    }
                  }}
                />
              </label>
            </div>
            {errors.file && (
              <p className="text-xs text-red-500">{errors.file.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="separator">分段标识符</Label>
              <Input
                id="separator"
                {...register('separator')}
                placeholder="\\n\\n\\n"
              />
              {errors.separator && (
                <p className="text-xs text-red-500">{errors.separator.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxTokens">最大分段长度</Label>
              <Input
                id="maxTokens"
                type="number"
                {...register('maxTokens')}
              />
              {errors.maxTokens && (
                <p className="text-xs text-red-500">{errors.maxTokens.message}</p>
              )}
            </div>
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
            disabled={isSubmitting || !uploadFile}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                上传中...
              </>
            ) : (
              '开始上传'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
