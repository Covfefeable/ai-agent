import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Plus, MessageSquare, ChevronUp, User, Trash2, Database, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { chatApi } from '@/api/chat';

interface Conversation {
  id: string;
  name: string;
  inputs: unknown;
  status: string;
  created_at: number;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      await chatApi.deleteConversation(deleteId);
      setConversations(prev => prev.filter(c => c.id !== deleteId));
      if (location.pathname === `/chat/${deleteId}`) {
        navigate('/');
      }
      setDeleteId(null);
      fetchConversations();
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteId(id);
  };

  const fetchConversations = async () => {
    try {
      const response = await chatApi.getConversations();
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  useEffect(() => {
    // Update document title based on route
    if (location.pathname === '/' || location.pathname.startsWith('/chat/')) {
      document.title = 'Super Agent - 对话';
    } else if (location.pathname === '/knowledge') {
      document.title = 'Super Agent - 知识库';
    } else if (location.pathname.startsWith('/knowledge/')) {
      document.title = 'Super Agent - 知识库详情';
    }
  }, [location.pathname]);

  useEffect(() => {
    fetchConversations();
    // Listen for custom event to refresh conversations
    const handleRefresh = () => {
      fetchConversations();
    };
    window.addEventListener('refreshConversations', handleRefresh);
    return () => {
      window.removeEventListener('refreshConversations', handleRefresh);
    };
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuItems = [
    { id: 'chat', label: 'Super Agent 聊天', icon: MessageSquare, path: '/' },
    { id: 'knowledge', label: '知识库', icon: Database, path: '/knowledge' },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f9fafb] font-sans">
      {/* Sidebar */}
      <aside className="flex w-72 flex-col border-r border-slate-200 bg-white shadow-sm">
        <div className="p-6">
          <Button 
            className="w-full justify-center gap-2 rounded-xl bg-slate-900 py-6 text-base font-semibold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-slate-200" 
            variant="default"
            onClick={() => {
              navigate('/');
              window.location.reload(); // Force reload to clear state
            }}
          >
            <Plus className="h-5 w-5" />
            新建对话
          </Button>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-2 overflow-y-auto">
          <div className="mb-4 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            功能列表
          </div>
          {menuItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                location.pathname === item.path && !location.search
                  ? "bg-slate-100 text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-colors",
                location.pathname === item.path && !location.search ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
              )} />
              {item.label}
            </Link>
          ))}

          {conversations.length > 0 && (
            <>
              <div className="mb-2 mt-6 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                历史会话
              </div>
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    to={`/?conversation_id=${conv.id}`}
                    className={cn(
                      "group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                      location.search.includes(conv.id)
                        ? "bg-slate-100 text-slate-900 shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {/* <MessageSquare className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        location.search.includes(conv.id) ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                      )} /> */}
                      <span className="truncate">{conv.name || 'New Chat'}</span>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(e, conv.id)}
                      className="hidden text-slate-400 hover:text-red-600 group-hover:block"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </Link>
                ))}
              </div>
            </>
          )}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="relative">
            {isMenuOpen && (
              <div className="absolute bottom-full left-0 mb-3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                {(user?.role === 'owner' || user?.role === 'admin') && (
                  <>
                    <button
                      onClick={() => {
                        navigate('/users');
                        setIsMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-5 py-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Users className="h-4 w-4" />
                      用户管理
                    </button>
                    <div className="h-px w-full bg-slate-100" />
                    <button
                      onClick={() => {
                        navigate('/agents');
                        setIsMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-5 py-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Users className="h-4 w-4" />
                      智能体管理
                    </button>
                    <div className="h-px w-full bg-slate-100" />
                  </>
                )}
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-5 py-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </button>
              </div>
            )}
            
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl p-3 transition-all duration-200",
                isMenuOpen ? "bg-slate-100" : "hover:bg-slate-50"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
                <User className="h-5 w-5" />
              </div>
              <div className="flex flex-1 flex-col overflow-hidden text-left">
                <span className="truncate text-sm font-bold text-slate-900">{user.name}</span>
                <span className="truncate text-[11px] font-medium text-slate-500">{user.email}</span>
              </div>
              <ChevronUp className={cn(
                "h-4 w-4 text-slate-400 transition-transform duration-200",
                isMenuOpen ? "rotate-180" : ""
              )} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="删除会话"
        description="确定要删除这个会话吗？此操作无法撤销。"
        confirmText="删除"
        variant="destructive"
      />
    </div>
  );
}
