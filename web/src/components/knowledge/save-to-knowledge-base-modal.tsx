import { useEffect, useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { knowledgeApi, type Dataset } from '@/api/knowledge';

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
  const [name, setName] = useState('');
  const [datasetId, setDatasetId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const options = useMemo(
    () => knowledgeBases.map((kb) => ({ label: kb.name, value: kb.id })),
    [knowledgeBases]
  );

  useEffect(() => {
    if (!isOpen) return;

    setName(defaultName || '');
    setDatasetId(() => {
      if (defaultDatasetId) return defaultDatasetId;
      return knowledgeBases[0]?.id || '';
    });
  }, [isOpen, defaultName, defaultDatasetId, knowledgeBases]);

  const close = () => {
    if (submitting) return;
    onClose();
  };

  const submit = async () => {
    const trimmedName = name.trim();
    const trimmedText = text.trim();

    if (!trimmedName) {
      toast.error('请输入文档名称');
      return;
    }
    if (!datasetId) {
      toast.error('请选择知识库');
      return;
    }
    if (!trimmedText) {
      toast.error('内容为空，无法保存');
      return;
    }

    try {
      setSubmitting(true);
      await knowledgeApi.createDocumentByText(datasetId, { name: trimmedName, text });
      toast.success('已保存到知识库');
      setSubmitting(false);
      onClose();
    } catch (e) {
      setSubmitting(false);
      console.error('Save to knowledge base failed:', e);
      toast.error('保存失败');
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

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="save-kb-name">文档名称</Label>
            <Input
              id="save-kb-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入文档名称"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="save-kb-dataset">选择知识库</Label>
            <Select
              options={options}
              value={datasetId}
              onChange={setDatasetId}
              placeholder={knowledgeBases.length === 0 ? '暂无知识库' : '请选择知识库'}
              disabled={submitting || knowledgeBases.length === 0}
            />
            {knowledgeBases.length === 0 && (
              <p className="text-xs text-slate-500">请先在「知识库」页面创建知识库</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={close} disabled={submitting}>
            取消
          </Button>
          <Button
            type="button"
            className="bg-black hover:bg-black/80 text-white"
            onClick={submit}
            disabled={submitting || knowledgeBases.length === 0}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}

