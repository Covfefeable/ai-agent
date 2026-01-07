import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { knowledgeApi, type Segment } from '@/api/knowledge';
import { toast } from 'sonner';

interface EditSegmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  datasetId: string;
  documentId: string;
  segment: Segment;
}

export function EditSegmentModal({ isOpen, onClose, onSuccess, datasetId, documentId, segment }: EditSegmentModalProps) {
  const [content, setContent] = useState(segment.content);
  const [keywords, setKeywords] = useState(segment.keywords || []);
  const [newKeyword, setNewKeyword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setContent(segment.content);
      setKeywords(segment.keywords || []);
      setNewKeyword('');
    }
  }, [isOpen, segment]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('内容不能为空');
      return;
    }
    try {
      setIsSaving(true);
      await knowledgeApi.updateSegment(datasetId, documentId, segment.id, {
        content,
        keywords
      });
      toast.success('更新成功');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Update segment failed:', error);
      toast.error('更新失败');
    } finally {
      setIsSaving(false);
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    setKeywords(keywords.filter(k => k !== keywordToRemove));
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
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[200px] rounded-lg border border-slate-200 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="分段内容..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">关键词</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="输入关键词并回车..."
              />
              <Button onClick={addKeyword} variant="outline" className="shrink-0">
                添加
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {keywords.map((keyword, index) => (
                <span key={index} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {keyword}
                  <button onClick={() => removeKeyword(keyword)} className="ml-1 hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>取消</Button>
          <Button onClick={handleSave} isLoading={isSaving} className="bg-black hover:bg-black/80 text-white">保存</Button>
        </div>
      </div>
    </div>
  );
}
