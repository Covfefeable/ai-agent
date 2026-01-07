import { useEffect, useState, useCallback } from 'react';
import { Search, Users, Calendar } from 'lucide-react';
import { agentsApi, type Agent } from '@/api/agents';
import { agentCategoriesApi, type AgentCategory } from '@/api/agentCategories';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function AgentsSquarePage() {
  const [items, setItems] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categories, setCategories] = useState<AgentCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [agentsRes, catsRes] = await Promise.all([
        agentsApi.publicList(searchKeyword, categoryId || undefined),
        agentCategoriesApi.list()
      ]);
      setItems(agentsRes.data);
      setCategories(catsRes.data);
    } catch {
      toast.error('获取智能体广场数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [searchKeyword, categoryId]);

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 400);
    return () => clearTimeout(timer);
  }, [fetchData]);

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex h-16 items-center justify-between border-b border-slate-100 px-8">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800">智能体广场</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索智能体..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="h-9 w-64 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
        <div className="mb-4 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setCategoryId('')}
            className={`h-9 rounded-lg px-3 text-sm ${categoryId === '' ? 'bg-black text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            全部
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={`h-9 rounded-lg px-3 text-sm ${categoryId === c.id ? 'bg-black text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              title={c.name}
            >
              {c.name}
            </button>
          ))}
        </div>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Users className="h-8 w-8 text-slate-400 animate-pulse" />
          </div>
        ) : items.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((ag) => (
              <div 
                key={ag.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
              >
                {ag.iconUrl && (
                  <div className="absolute inset-0 z-0 pointer-events-none">
                    <img 
                      src={ag.iconUrl} 
                      alt="" 
                      className="h-full w-full object-cover opacity-15 blur-2xl scale-110 transition-transform duration-700 ease-out group-hover:scale-125 group-hover:rotate-1"
                    />
                    <div className="absolute inset-0 bg-white/50" />
                  </div>
                )}
                <div className="relative z-10">
                  <div className="mb-4 flex items-center gap-3">
                    {ag.iconUrl ? (
                      <img src={ag.iconUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify中心 rounded-lg bg-slate-900 text-white">
                        <Users className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-slate-900 line-clamp-1" title={ag.title}>
                    {ag.title}
                  </h3>
                  <p className="mb-4 text-sm text-slate-500 line-clamp-2 min-h-[40px]" title={ag.description || ''}>
                    {ag.description || '暂无描述'}
                  </p>
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-50 pt-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{format(new Date(ag.createdAt), 'yyyy-MM-dd')}</span>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                    {ag.isPublic ? '公开' : '私有'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
                <Users className="h-10 w-10" />
              </div>
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">暂无公开智能体</h3>
            <p className="text-slate-500">可以通过分类或搜索尝试找到你需要的智能体。</p>
          </div>
        )}
      </div>
    </div>
  );
}
