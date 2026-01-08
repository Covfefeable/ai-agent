import { Bot, Database, Users } from 'lucide-react';

export function HomeSkeleton() {
  return (
    <div className="flex h-full w-full bg-[#f9fafb]">
      {/* Sidebar */}
      <div className="flex h-full w-72 shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm">
        {/* Logo Area - Matches DashboardLayout px-6 pt-4 pb-2 */}
        <div className="hidden px-6 pb-2 pt-4 md:flex">
          <div className="flex items-center gap-3">
            <svg
              width="40"
              height="40"
              viewBox="0 0 120 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
            >
              <rect x="28" y="44" width="16" height="32" rx="4" fill="#000" />
              <rect x="52" y="36" width="16" height="48" rx="4" fill="#000" />
              <rect x="76" y="44" width="16" height="32" rx="4" fill="#000" />
            </svg>
            <span className="text-xl font-bold tracking-tight text-slate-900">Super Agent</span>
          </div>
        </div>

        {/* Nav Area - Matches DashboardLayout px-4 py-2 */}
        <div className="mt-2 flex-1 space-y-1 px-4 py-2">
          <div className="mb-4 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            功能列表
          </div>

          {/* Active Item (Chat) */}
          <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-900 shadow-sm">
            <Bot className="h-5 w-5 text-slate-900" />
            Super Agent 聊天
          </div>

          {/* Inactive Items */}
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600">
            <Database className="h-5 w-5 text-slate-400" />
            知识库
          </div>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600">
            <Users className="h-5 w-5 text-slate-400" />
            智能体广场
          </div>
        </div>

        {/* User Profile Area - Matches DashboardLayout p-4 border-t */}
        <div className="relative mt-auto border-t border-slate-100 p-4">
          <div className="flex w-full items-center gap-3 rounded-2xl p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
              <div className="h-5 w-5 rounded-full bg-slate-400" />
            </div>
            <div className="flex flex-1 flex-col overflow-hidden text-left">
              <div className="mb-1 h-4 w-20 rounded bg-slate-200" />
              <div className="h-3 w-32 rounded bg-slate-100" />
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex h-full flex-1 flex-col bg-[#f9fafb]">
        <div className="flex-1 p-4 md:p-8">
          {/* Empty state or message list placeholder */}
        </div>
      </div>
    </div>
  );
}

