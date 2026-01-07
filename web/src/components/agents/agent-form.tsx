import { Button } from '@/components/ui/button';
import { File as FileIcon, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { agentsApi } from '@/api/agents';
import { getFileType } from '@/lib/utils';

export interface FormItem {
  type: 'text-input' | 'paragraph' | 'select' | 'number' | 'checkbox' | 'file' | 'file-list';
  variable: string;
  label: string;
  required?: boolean;
  options?: string[];
  max_length?: number;
  placeholder?: string;
  default?: string;
  allowed_file_upload_methods?: string[];
  allowed_file_types?: string[];
  allowed_file_extensions?: string[];
}

export type FormValues = Record<string, string | number | boolean | Array<{ id: string; name: string; type: string }>>;

export interface UploadConfig {
  enabled: boolean;
  allowedTypes: string[];
  allowedExtensions: string[];
  allowedMethods: string[];
  numberLimits: number;
  sizeLimits: { file: number; image: number; video: number; audio: number };
}

interface AgentFormProps {
  agentId: string;
  formItems: FormItem[];
  formValues: FormValues;
  onValuesChange: (values: (prev: FormValues) => FormValues) => void;
  onSubmit: () => void;
  uploadConfig: UploadConfig;
  loading: boolean;
  streaming: boolean;
  formSubmitted: boolean;
  formOpen: boolean;
  onFormOpenChange: (open: boolean) => void;
  isFormValid: () => boolean;
}

export function AgentForm({
  agentId,
  formItems,
  formValues,
  onValuesChange,
  onSubmit,
  uploadConfig,
  loading,
  streaming,
  formSubmitted,
  formOpen,
  onFormOpenChange,
  isFormValid,
}: AgentFormProps) {
  if (formItems.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">对话前表单</div>
          <span className="text-[11px] text-slate-500">填写后即可开始对话</span>
        </div>
        <div className="flex items-center gap-2">
          {formSubmitted && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[11px] text-green-700">已提交</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-slate-500 sm:text-slate-500 text-white"
            onClick={() => onFormOpenChange(!formOpen)}
            title={formOpen ? '收起' : '展开'}
          >
            {formOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {formOpen && (
        <div className="grid grid-cols-1 gap-4">
          {formItems.map(item => (
            <div key={item.variable} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-800">
                {item.label}{item.required ? ' *' : ''}
              </label>
              {item.type === 'text-input' && (
                <input
                  type="text"
                  value={String(formValues[item.variable] ?? '')}
                  placeholder={item.placeholder || ''}
                  maxLength={item.max_length}
                  onChange={(e) => onValuesChange(v => ({ ...v, [item.variable]: e.target.value }))}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              )}
              {item.type === 'paragraph' && (
                <textarea
                  value={String(formValues[item.variable] ?? '')}
                  placeholder={item.placeholder || ''}
                  maxLength={item.max_length}
                  onChange={(e) => onValuesChange(v => ({ ...v, [item.variable]: e.target.value }))}
                  className="min-h-[90px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              )}
              {item.type === 'select' && (
                <select
                  value={String(formValues[item.variable] ?? '')}
                  onChange={(e) => onValuesChange(v => ({ ...v, [item.variable]: e.target.value }))}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value="">{item.placeholder || '请选择'}</option>
                  {(item.options || []).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
              {item.type === 'number' && (
                <input
                  type="number"
                  value={Number(formValues[item.variable] ?? 0)}
                  onChange={(e) => onValuesChange(v => ({ ...v, [item.variable]: Number(e.target.value) }))}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              )}
              {item.type === 'checkbox' && (
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={Boolean(formValues[item.variable] ?? false)}
                    onChange={(e) => onValuesChange(v => ({ ...v, [item.variable]: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {item.placeholder || '选择'}
                </label>
              )}
              {item.type === 'file' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id={`file-upload-${item.variable}`}
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !agentId) return;
                        if (!item.allowed_file_upload_methods?.includes('local_file')) {
                          toast.error('未允许本地文件上传');
                          (e.target as HTMLInputElement).value = '';
                          return;
                        }
                        const t = getFileType(file);
                        if (Array.isArray(item.allowed_file_types) && item.allowed_file_types.length > 0 && !item.allowed_file_types.includes(t)) {
                          toast.error('不支持的文件类型');
                          (e.target as HTMLInputElement).value = '';
                          return;
                        }
                        const mb = 1024 * 1024;
                        let limitMb = uploadConfig.sizeLimits.file;
                        if (t === 'image' && uploadConfig.sizeLimits.image) limitMb = uploadConfig.sizeLimits.image;
                        if (t === 'video' && uploadConfig.sizeLimits.video) limitMb = uploadConfig.sizeLimits.video;
                        if (t === 'audio' && uploadConfig.sizeLimits.audio) limitMb = uploadConfig.sizeLimits.audio;
                        if (limitMb > 0 && file.size > limitMb * mb) {
                          toast.error(`文件大小超过限制（最大${limitMb}MB）`);
                          (e.target as HTMLInputElement).value = '';
                          return;
                        }
                        try {
                          const resp = await agentsApi.uploadFile(agentId, file);
                          onValuesChange(v => ({ ...v, [item.variable]: [{ id: resp.id, name: file.name, type: t }] }));
                        } catch {
                          void 0;
                        } finally {
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2 px-3 text-slate-600 hover:text-slate-900"
                      onClick={() => document.getElementById(`file-upload-${item.variable}`)?.click()}
                    >
                      <FileIcon className="h-4 w-4" />
                      <span>选择文件</span>
                    </Button>
                    <span className="text-xs text-slate-400">
                      {(Array.isArray(formValues[item.variable]) && (formValues[item.variable] as Array<{ id: string; name: string; type: string }>).length > 0)
                        ? '已选择 1 个文件'
                        : '未选择任何文件'}
                    </span>
                  </div>
                  {Array.isArray(formValues[item.variable]) && (formValues[item.variable] as Array<{ id: string; name: string; type: string }>).length === 1 && (
                    <div className="group relative flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 border border-slate-100">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                        <FileIcon className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700 max-w-[160px] truncate" title={(formValues[item.variable] as Array<{ id: string; name: string; type: string }>)[0].name}>{(formValues[item.variable] as Array<{ id: string; name: string; type: string }>)[0].name}</span>
                        <span className="text-[10px] text-slate-400">File</span>
                      </div>
                      <button
                        onClick={() => onValuesChange(v => ({ ...v, [item.variable]: [] }))}
                        className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-all group-hover:flex hover:bg-red-600"
                        title="移除"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              {item.type === 'file-list' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id={`file-list-upload-${item.variable}`}
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !agentId) return;
                        if (!item.allowed_file_upload_methods?.includes('local_file')) {
                          toast.error('未允许本地文件上传');
                          (e.target as HTMLInputElement).value = '';
                          return;
                        }
                        const t = getFileType(file);
                        if (Array.isArray(item.allowed_file_types) && item.allowed_file_types.length > 0 && !item.allowed_file_types.includes(t)) {
                          toast.error('不支持的文件类型');
                          (e.target as HTMLInputElement).value = '';
                          return;
                        }
                        const mb = 1024 * 1024;
                        let limitMb = uploadConfig.sizeLimits.file;
                        if (t === 'image' && uploadConfig.sizeLimits.image) limitMb = uploadConfig.sizeLimits.image;
                        if (t === 'video' && uploadConfig.sizeLimits.video) limitMb = uploadConfig.sizeLimits.video;
                        if (t === 'audio' && uploadConfig.sizeLimits.audio) limitMb = uploadConfig.sizeLimits.audio;
                        if (limitMb > 0 && file.size > limitMb * mb) {
                          toast.error(`文件大小超过限制（最大${limitMb}MB）`);
                          (e.target as HTMLInputElement).value = '';
                          return;
                        }
                        const current = Array.isArray(formValues[item.variable]) ? (formValues[item.variable] as Array<{ id: string; name: string; type: string }>) : [];
                        const ml = typeof item.max_length === 'number' ? item.max_length : undefined;
                        if (ml && current.length >= ml) {
                          toast.error(`最多上传${ml}个文件`);
                          (e.target as HTMLInputElement).value = '';
                          return;
                        }
                        try {
                          const resp = await agentsApi.uploadFile(agentId, file);
                          const next = [...current, { id: resp.id, name: file.name, type: t }];
                          onValuesChange(v => ({ ...v, [item.variable]: next }));
                        } catch {
                          void 0;
                        } finally {
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2 px-3 text-slate-600 hover:text-slate-900"
                      onClick={() => document.getElementById(`file-list-upload-${item.variable}`)?.click()}
                    >
                      <FileIcon className="h-4 w-4" />
                      <span>选择文件</span>
                    </Button>
                    <span className="text-[11px] text-slate-500">
                      {Array.isArray(formValues[item.variable]) ? (formValues[item.variable] as Array<{ id: string; name: string; type: string }>).length : 0}
                      {item.max_length ? ` / ${item.max_length}` : ''}
                    </span>
                  </div>
                  {Array.isArray(formValues[item.variable]) && (formValues[item.variable] as Array<{ id: string; name: string; type: string }>).length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {(formValues[item.variable] as Array<{ id: string; name: string; type: string }>).map(f => (
                        <div key={f.id} className="group relative flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 border border-slate-100">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                            <FileIcon className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-700 max-w-[160px] truncate" title={f.name}>{f.name}</span>
                            <span className="text-[10px] text-slate-400">File</span>
                          </div>
                          <button
                            onClick={() => {
                              const arr = (formValues[item.variable] as Array<{ id: string; name: string; type: string }>).filter(x => x.id !== f.id);
                              onValuesChange(v => ({ ...v, [item.variable]: arr }));
                            }}
                            className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-all group-hover:flex hover:bg-red-600"
                            title="移除"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {formOpen && (
        <div className="mt-4 flex items-center justify-end">
          <Button
            onClick={onSubmit}
            disabled={loading || streaming || !isFormValid()}
            className={`h-9 rounded-lg px-4 text-sm ${
              (loading || streaming || !isFormValid())
                ? 'bg-slate-200 text-slate-400'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md active:scale-95'
            }`}
          >
            提交
          </Button>
        </div>
      )}
    </div>
  );
}
