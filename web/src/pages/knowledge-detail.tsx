import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, HardDrive, Plus, X, Upload, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { knowledgeApi, type Document } from '@/api/knowledge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

export function KnowledgeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [separator, setSeparator] = useState('\\n\\n\\n');
  const [maxTokens, setMaxTokens] = useState(500);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchDocuments();
    }
  }, [id]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await knowledgeApi.getDocuments(id!);
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast.error('获取文档列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !id) return;

    try {
      setIsUploading(true);
      const actualSeparator = separator.replace(/\\n/g, '\n');

      await knowledgeApi.uploadDocument(id, uploadFile, {
        separator: actualSeparator,
        max_tokens: maxTokens,
      });
      
      toast.success('文档上传成功');
      setIsUploadModalOpen(false);
      setUploadFile(null);
      fetchDocuments();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !id) return;

    try {
      await knowledgeApi.deleteDocument(id, deleteId);
      toast.success('删除文档成功');
      setDeleteId(null);
      fetchDocuments();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('删除失败');
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex h-16 items-center justify-between border-b border-slate-100 px-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/knowledge')}>
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </Button>
          <h2 className="text-lg font-bold text-slate-800">文档列表</h2>
        </div>
        <Button 
          onClick={() => setIsUploadModalOpen(true)} 
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          <Plus className="h-4 w-4" />
          添加文档
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : documents.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">名称</th>
                    <th className="px-6 py-4 font-medium">字符数</th>
                    <th className="px-6 py-4 font-medium">状态</th>
                    <th className="px-6 py-4 font-medium">创建时间</th>
                    <th className="px-6 py-4 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <FileText className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-slate-900">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {(doc.word_count || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          doc.indexing_status === 'completed' 
                            ? 'bg-green-50 text-green-700' 
                            : doc.indexing_status === 'error'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-yellow-50 text-yellow-700'
                        }`}>
                          {doc.indexing_status === 'completed' ? '已完成' : 
                           doc.indexing_status === 'error' ? '失败' : '处理中'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {format(new Date(doc.created_at * 1000), 'yyyy-MM-dd HH:mm')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setDeleteId(doc.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="删除文档"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center gap-4 text-slate-500">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <HardDrive className="h-8 w-8 text-slate-400" />
            </div>
            <p>暂无文档</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="删除文档"
        description="确定要删除这个文档吗？此操作无法撤销。"
      />

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">上传文档</h3>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
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
                    <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100">
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
                  onClick={() => setIsUploadModalOpen(false)}
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
      )}
    </div>
  );
}
