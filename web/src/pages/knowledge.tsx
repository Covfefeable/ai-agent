import { Database } from 'lucide-react';

export function KnowledgePage() {
  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <header className="flex h-16 items-center border-b border-slate-100 px-8">
        <h2 className="text-lg font-bold text-slate-800">知识库</h2>
      </header>

      {/* Content */}
      <div className="flex-1 p-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
              <Database className="h-10 w-10" />
            </div>
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-900">知识库管理</h3>
          <p className="text-slate-500">在这里管理你的知识库文档和数据。</p>
        </div>
      </div>
    </div>
  );
}
