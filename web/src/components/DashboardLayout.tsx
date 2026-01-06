import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Plus, MessageSquare, ChevronUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuItems = [
    { id: 'chat', label: '通用 Agent 聊天', icon: MessageSquare, path: '/' },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f9fafb] font-sans">
      {/* Sidebar */}
      <aside className="flex w-72 flex-col border-r border-slate-200 bg-white shadow-sm">
        <div className="p-6">
          <Button 
            className="w-full justify-center gap-2 rounded-xl bg-slate-900 py-6 text-base font-semibold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-slate-200" 
            variant="default"
            onClick={() => window.location.reload()}
          >
            <Plus className="h-5 w-5" />
            新建对话
          </Button>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-2">
          <div className="mb-4 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            功能列表
          </div>
          {menuItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                location.pathname === item.path
                  ? "bg-slate-100 text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-colors",
                location.pathname === item.path ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
              )} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="relative">
            {isMenuOpen && (
              <div className="absolute bottom-full left-0 mb-3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
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
    </div>
  );
}
