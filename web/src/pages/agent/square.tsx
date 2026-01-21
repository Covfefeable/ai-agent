import { useEffect, useState, useCallback } from 'react';
import { Search, Calendar, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { agentsApi, type Agent } from '@/api/agents';
import { agentCategoriesApi, type AgentCategory } from '@/api/agentCategories';
import dayjs from 'dayjs';
import { Tooltip } from 'antd';
import { Pagination } from '@/components/ui/pagination';
import { Loading } from '@/components/ui/loading';

export function AgentsSquarePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categories, setCategories] = useState<AgentCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 12;

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [agentsRes, catsRes] = await Promise.all([
        agentsApi.publicList(searchKeyword, categoryId || undefined, currentPage, pageSize),
        agentCategoriesApi.list()
      ]);
      setItems(agentsRes.data);
      setTotalItems(agentsRes.total || agentsRes.data?.length || 0);
      setCategories(catsRes.data);
    } catch (e) {
      console.error('Get agent square data failed', e);
    } finally {
      setIsLoading(false);
    }
  }, [searchKeyword, categoryId, currentPage]);

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 400);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // Reset page when search keyword or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword, categoryId]);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <header className="flex h-16 items-center justify-between border-b border-slate-100 pl-14 pr-4 md:px-8">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800 whitespace-nowrap">智能体广场</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索智能体..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="h-9 w-40 md:w-64 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
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
          <Loading />
        ) : items.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
              {items.map((ag) => (
                <motion.div 
                  layoutId={`agent-card-${ag.id}`}
                  key={ag.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md cursor-pointer"
                  onClick={() => navigate(`/agents-square/${ag.id}`)}
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                          <Bot className="h-5 w-5" />
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
                      <span>{dayjs(ag.createdAt).format('YYYY-MM-DD')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {ag.multiplier !== 1 && ag.multiplier > 0 ? (
                        <Tooltip
                          title={<p>结算 Token 数 = 实际消耗量 × 倍率</p>}
                          placement="top"
                        >
                          <span 
                            className={cn(
                              "rounded px-2 py-0.5 cursor-help",
                              ag.multiplier > 1 
                                ? "bg-orange-100 text-orange-600"
                                : "bg-blue-100 text-blue-600"
                            )}
                          >
                            {ag.multiplier}x
                          </span>
                        </Tooltip>
                      ) : ag.multiplier <= 0 ? (
                        <span 
                          className="rounded bg-green-100 px-2 py-0.5 text-green-600"
                        >
                          Free
                        </span>
                      ) : null}
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                        {ag.visibility === 'public' ? '公开' : ag.visibility === 'private' ? '私有' : '指定用户组'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              className="justify-end mt-4"
            />
          </>
        ) : (
          <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
                <Bot className="h-10 w-10" />
              </div>
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">暂无公开智能体</h3>
            <p className="text-slate-500">可以通过分类或搜索尝试找到你需要的智能体。</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
