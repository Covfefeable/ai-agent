import { Check, Database, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover } from 'antd';
import { type Dataset } from '@/api/knowledge';

interface KnowledgeBaseSelectorProps {
  knowledgeBases: Dataset[];
  selectedKbIds: Set<string>;
  onKbSelect: (kbId: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KnowledgeBaseSelector({
  knowledgeBases,
  selectedKbIds,
  onKbSelect,
  open,
  onOpenChange
}: KnowledgeBaseSelectorProps) {
  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      placement="topLeft"
      trigger="click"
      overlayInnerStyle={{ padding: 0 }}
      content={
        <div className="w-64 p-2">
           <div className="mb-2 flex items-center justify-between px-2 pb-2 border-b border-slate-50">
              <span className="text-xs font-medium text-slate-500">需要引用的知识库</span>
              <button onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
           </div>
           <div className="max-h-48 overflow-y-auto space-y-1">
             {knowledgeBases.map(kb => (
               <div 
                 key={kb.id}
                 className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 cursor-pointer"
                 onClick={() => onKbSelect(kb.id)}
               >
                 <div className={cn(
                   "flex h-4 w-4 items-center justify-center rounded border transition-all",
                   selectedKbIds.has(kb.id) ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                 )}>
                   {selectedKbIds.has(kb.id) && <Check className="h-3 w-3" />}
                 </div>
                 <span className="text-xs text-slate-700 truncate">{kb.name}</span>
               </div>
             ))}
             {knowledgeBases.length === 0 && (
               <div className="px-2 py-4 text-center text-xs text-slate-400">
                 暂无知识库
               </div>
             )}
           </div>
        </div>
      }
    >
      <button
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
          selectedKbIds.size > 0
            ? "bg-blue-50 text-blue-600 hover:bg-blue-100" 
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        )}
      >
        <Database className={cn("h-3.5 w-3.5", selectedKbIds.size > 0 ? "text-blue-600" : "text-slate-400")} />
        知识库
        {selectedKbIds.size > 0 && (
          <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
            {selectedKbIds.size}
          </span>
        )}
      </button>
    </Popover>
  );
}
