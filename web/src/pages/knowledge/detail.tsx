import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, HardDrive, Plus, Trash2, Search } from 'lucide-react';
import dayjs from 'dayjs';
import { knowledgeApi, type Document } from '@/api/knowledge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { UploadDocumentModal } from '@/components/knowledge/upload-document-modal';
import { Pagination } from '@/components/ui/pagination';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';

export function KnowledgeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchKeyword, setSearchKeyword] = useState('');
  const debouncedKeyword = useDebounce(searchKeyword, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 20;
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setCurrentPage(1);
    }
  }, [id, debouncedKeyword]);

  useEffect(() => {
    if (id) {
      fetchDocuments();
    }
  }, [id, debouncedKeyword, currentPage]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await knowledgeApi.getDocuments(id!, currentPage, pageSize, debouncedKeyword);
      setDocuments(response.data);
      setTotalItems(response.total);
    } catch (error) {
      console.error('Failed to fetch segments:', error);
    } finally {
      setIsLoading(false);
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
      console.error('Delete segment failed:', error);
    } finally {
      // Clean up
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex h-16 items-center justify-between border-b border-slate-100 pl-14 pr-4 md:px-8">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/knowledge')}>
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </Button>
          <h2 className="text-lg font-bold text-slate-800 whitespace-nowrap">文档列表</h2>
          <div className="relative ml-2 md:ml-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索文档..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="h-9 w-32 md:w-64 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
        <Button 
          onClick={() => setIsUploadModalOpen(true)} 
          className="gap-2 bg-black hover:bg-black/80 text-white shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">添加文档</span>
          <span className="md:hidden">添加</span>
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : documents.length > 0 ? (
          <>
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
                      <tr 
                        key={doc.id} 
                        className="cursor-pointer hover:bg-slate-50/50"
                        onClick={() => navigate(`/knowledge/${id}/document/${doc.id}`)}
                      >
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
                          {dayjs(doc.created_at * 1000).format('YYYY-MM-DD HH:mm')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(doc.id);
                            }}
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
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              className="justify-end mt-4"
            />
          </>
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

      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={fetchDocuments}
        datasetId={id!}
      />
    </div>
  );
}
