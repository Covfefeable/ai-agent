import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlignLeft, Hash, Tag, Clock, Pencil, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import { knowledgeApi, type Segment } from '@/api/knowledge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EditSegmentModal } from '@/components/knowledge/edit-segment-modal';
import { Pagination } from '@/components/ui/pagination';
import { toast } from 'sonner';
import { MarkdownRenderer } from '@/components/markdown-renderer';

export function DocumentDetailPage() {
  const { datasetId, documentId } = useParams<{ datasetId: string; documentId: string }>();
  const navigate = useNavigate();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [deletingSegmentId, setDeletingSegmentId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    if (datasetId && documentId) {
      fetchSegments();
    }
  }, [datasetId, documentId, currentPage]);

  const fetchSegments = async () => {
    try {
      setIsLoading(true);
      const response = await knowledgeApi.getSegments(datasetId!, documentId!, currentPage, pageSize);
      setSegments(response.data);
      setTotalItems(response.total);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const handleDelete = async () => {
    if (!deletingSegmentId || !datasetId || !documentId) return;

    try {
      setIsDeleting(true);
      await knowledgeApi.deleteSegment(datasetId, documentId, deletingSegmentId);
      toast.success('删除成功');
      setDeletingSegmentId(null);
      fetchSegments();
    } catch (error) {
      console.error('Delete document failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex h-16 items-center justify-between border-b border-slate-100 pl-14 pr-4 md:px-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/knowledge/${datasetId}`)}>
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </Button>
          <h2 className="text-lg font-bold text-slate-800">文档详情</h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : segments.length > 0 ? (
          <>
            <div className="space-y-4">
              {segments.map((segment) => (
                <div key={segment.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-xs font-medium text-slate-600">
                        #{segment.position}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        segment.status === 'completed' 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {segment.status === 'completed' ? '已索引' : '处理中'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {segment.word_count} 字
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {dayjs(segment.created_at * 1000).format('YYYY-MM-DD HH:mm')}
                      </div>
                      <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-slate-400 hover:text-blue-600"
                          onClick={() => setEditingSegment(segment)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-slate-400 hover:text-red-600"
                          onClick={() => setDeletingSegmentId(segment.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                    <MarkdownRenderer 
                      content={segment.content} 
                      className="prose prose-sm max-w-none prose-slate prose-pre:bg-slate-200 prose-pre:text-slate-900"
                    />
                  </div>

                  {segment.keywords && segment.keywords.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {segment.keywords.map((keyword, index) => (
                        <span key={index} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600">
                          <Tag className="h-3 w-3" />
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
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
              <AlignLeft className="h-8 w-8 text-slate-400" />
            </div>
            <p>暂无分段内容</p>
          </div>
        )}
      </div>

      {editingSegment && datasetId && documentId && (
        <EditSegmentModal
          isOpen={!!editingSegment}
          onClose={() => setEditingSegment(null)}
          onSuccess={fetchSegments}
          datasetId={datasetId}
          documentId={documentId}
          segment={editingSegment}
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingSegmentId}
        onClose={() => setDeletingSegmentId(null)}
        onConfirm={handleDelete}
        title="确认删除"
        description="确定要删除这个分段吗？此操作无法撤销。"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}
