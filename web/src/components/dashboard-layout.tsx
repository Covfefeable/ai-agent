import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, ChevronUp, User, Database, Users, Bot, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { favoritesApi } from '@/api/favorites';
import { type Agent } from '@/api/agents';
import { routeTitles, profileMenuItems } from '@/constants/dashboard';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [favoriteAgents, setFavoriteAgents] = useState<(Agent & { favoritedAt: string })[]>([]);

  useEffect(() => {
    // Close mobile menu on route change
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    // Update document title based on route
    const currentRoute = routeTitles.find(route => {
      if (route.exact) {
        return location.pathname === route.path;
      }
      if (route.prefix) {
        return location.pathname.startsWith(route.path);
      }
      return false;
    });

    if (currentRoute) {
      document.title = currentRoute.title;
    }
  }, [location.pathname]);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const res = await favoritesApi.list();
        setFavoriteAgents(res.data);
      } catch (e) {
        console.error('Failed to fetch favorite agents', e);
      }
    };
    fetchFavorites();

    const handleRefresh = () => fetchFavorites();
    window.addEventListener('refreshFavorites', handleRefresh);
    return () => window.removeEventListener('refreshFavorites', handleRefresh);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuItems = [
    { id: 'chat', label: 'Super Agent 聊天', icon: MessageSquare, path: '/' },
    { id: 'knowledge', label: '知识库', icon: Database, path: '/knowledge' },
    { id: 'agents-square', label: '智能体广场', icon: Users, path: '/agents-square' },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f9fafb] font-sans">
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsMobileMenuOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2 text-slate-600 hover:bg-slate-100 rounded-lg bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-sm"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r border-slate-200 bg-white shadow-sm transition-transform duration-300 ease-in-out md:static md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-100">
          <Link to="/" className="font-bold text-lg text-slate-900">Super Agent</Link>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="hidden md:flex px-6 pt-4 pb-2">
          <Link to="/">
            <Logo />
          </Link>
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

          {favoriteAgents.length > 0 && (
            <div className="mt-6 mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              我的智能体
            </div>
          )}
          {favoriteAgents.map((agent) => (
            <Link
              key={agent.id}
              to={`/chat/${agent.id}`}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                location.pathname === `/chat/${agent.id}`
                  ? "bg-slate-100 text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {agent.iconUrl ? (
                <img src={agent.iconUrl} alt={agent.title} className="h-5 w-5 rounded-md object-cover" />
              ) : (
                <Bot className={cn(
                  "h-5 w-5 transition-colors",
                  location.pathname === `/chat/${agent.id}` ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                )} />
              )}
              <span className="truncate">{agent.title}</span>
            </Link>
          ))}
        </nav>

        <div className="relative mt-auto border-t border-slate-100 p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex w-full items-center gap-3 rounded-2xl p-3 transition-all duration-200 hover:bg-slate-50 outline-none data-[state=open]:bg-slate-100"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-transparent text-slate-900 overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </div>
                <div className="flex flex-1 flex-col overflow-hidden text-left">
                  <span className="truncate text-sm font-bold text-slate-900">{user.name}</span>
                  <span className="truncate text-[11px] font-medium text-slate-500">{user.email}</span>
                </div>
                <ChevronUp className="h-4 w-4 text-slate-400 transition-transform duration-200" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-64 p-2 mb-2" sideOffset={10}>
              {profileMenuItems.map((item, index) => {
                // Check role permission
                if (item.roles && !item.roles.includes(user?.role)) {
                  return null;
                }

                return (
                  <div key={index}>
                    <DropdownMenuItem 
                      onClick={() => {
                        if (item.action === 'logout') {
                          handleLogout();
                        } else if (item.path) {
                          navigate(item.path);
                        }
                      }} 
                      className={cn(
                        "gap-3 px-3 py-2.5 cursor-pointer",
                        item.className
                      )}
                    >
                      <item.icon className={cn("h-4 w-4", item.className ? "text-current" : "text-slate-500")} />
                      <span className={cn("font-medium", !item.className && "text-slate-700")}>{item.label}</span>
                    </DropdownMenuItem>
                    {item.separator && <DropdownMenuSeparator className="my-1 bg-slate-100" />}
                  </div>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
