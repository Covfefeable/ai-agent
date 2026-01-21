import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { X, Edit2, Trash2 } from 'lucide-react';
import type { Memory } from '@/api/memories';

interface MemoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  memories: Memory[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
  isLoading?: boolean;
}

export function MemoryDrawer({
  isOpen,
  onClose,
  memories,
  onDelete,
  onUpdate,
  isLoading
}: MemoryDrawerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  if (!isOpen) return null;

  const handleStartEdit = (memory: Memory) => {
    setEditingId(memory.id);
    setEditContent(memory.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleSaveEdit = () => {
    if (editingId && editContent.trim()) {
      onUpdate(editingId, editContent);
      setEditingId(null);
      setEditContent('');
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div className="relative ml-auto flex h-full w-96 flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h3 className="font-bold text-slate-800">我的记忆</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5 text-slate-500" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-1">
            {memories.map((memory) => (
              <div
                key={memory.id}
                className="group flex flex-col rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                {editingId === memory.id ? (
                  <div className="flex flex-col gap-2 w-full">
                    <textarea
                      value={editContent}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 120) {
                          setEditContent(value);
                        }
                      }}
                      maxLength={120}
                      className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm transition-all placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{editContent.length}/120</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                          取消
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit}>
                          保存
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3 w-full">
                    <p className="flex-1 break-all">{memory.content}</p>
                    <div className="flex shrink-0 gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button 
                        className="text-slate-400 hover:text-blue-500" 
                        onClick={() => handleStartEdit(memory)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        className="text-slate-400 hover:text-red-500"
                        onClick={() => onDelete(memory.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {memories.length === 0 && !isLoading && (
              <div className="py-8 text-center text-sm text-slate-400">
                暂无记忆
              </div>
            )}
            
            {isLoading && (
              <Loading className="h-auto py-2" iconClassName="h-4 w-4" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
