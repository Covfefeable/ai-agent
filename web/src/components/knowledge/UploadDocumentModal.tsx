import { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { knowledgeApi } from '@/api/knowledge';
import { toast } from 'sonner';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  datasetId: string;
}

export function UploadDocumentModal({ isOpen, onClose, onSuccess, datasetId }: UploadDocumentModalProps) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [separator, setSeparator] = useState('\\n\\n\\n');
  const [maxTokens, setMaxTokens] = useState(500);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !datasetId) return;

    try {
      setIsUploading(true);
      const actualSeparator = separator.replace(/\\n/g, '\n');

      await knowledgeApi.uploadDocument(datasetId, uploadFile, {
        separator: actualSeparator,
        max_tokens: maxTokens,
      });
      
      toast.success('文档上传成功');
      setUploadFile(null);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('上传失败');
    } finally {
      setIsUploading(false);
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
          <h3 className="text-lg font-bold text-slate-900">上传文档</h3>
          <button 
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleUpload}>
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
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="separator">分段标识符</Label>
                <Input
                  id="separator"
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value)}
                  placeholder="\n\n\n"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTokens">最大分段长度</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUploading}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isUploading || !uploadFile}
            >
              {isUploading ? (
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
      </div>
    </div>
  );
}
