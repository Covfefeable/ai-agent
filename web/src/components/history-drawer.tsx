import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loading } from '@/components/ui/loading';
import { X, Trash2 } from 'lucide-react';

export interface Conversation {
  id: string;
  name: string;
  inputs?: unknown;
  status?: string;
  created_at?: number;
}

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelect: (conversation: Conversation) => void;
  onDelete: (conversationId: string) => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  isLoadingMore?: boolean;
}

export function HistoryDrawer({
  isOpen,
  onClose,
  conversations,
  currentConversationId,
  onSelect,
  onDelete,
  onScroll,
  isLoadingMore
}: HistoryDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div className="relative ml-auto flex h-full w-80 flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h3 className="font-bold text-slate-800">历史会话</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5 text-slate-500" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-4" onScroll={onScroll}>
          <div className="space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group flex cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  currentConversationId === conv.id
                    ? "bg-slate-100 text-slate-900 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
                onClick={() => onSelect(conv)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="truncate">{conv.name || 'New Chat'}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  className="hidden text-slate-400 hover:text-red-600 group-hover:block"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {conversations.length === 0 && !isLoadingMore && (
              <div className="py-8 text-center text-sm text-slate-400">
                暂无历史会话
              </div>
            )}
            {isLoadingMore && (
              <Loading className="h-auto py-2" iconClassName="h-4 w-4" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
