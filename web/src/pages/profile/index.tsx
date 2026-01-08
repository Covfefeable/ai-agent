import { useState, useEffect } from 'react';
import { User, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChangePasswordModal } from '@/components/profile/change-password-modal';
import { userApi } from '@/api/user';

interface UsageItem {
  id: string;
  agentName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latency: string;
  totalPrice: string;
  currency: string;
  createdAt: string;
}

export function ProfilePage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [usageList, setUsageList] = useState<UsageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsage();
  }, [page]);

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const res = await userApi.getUsageList({ page, limit: pageSize }) as unknown as { data: UsageItem[], total: number };
      setUsageList(res.data || []);
      setTotal(res.total || 0);
    } catch (error) {
      console.error(error);
      setUsageList([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white overflow-y-auto">
      <header className="flex h-16 items-center justify-between border-b border-slate-100 px-8">
        <h2 className="text-lg font-bold text-slate-800">个人中心</h2>
      </header>

      <div className="flex-1 p-8">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* 用户信息卡片 */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">基本信息</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsPasswordModalOpen(true)}
                className="gap-1.5 h-8 px-3 text-xs"
              >
                <Lock className="h-3.5 w-3.5" />
                修改密码
              </Button>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <User className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <div className="text-lg font-semibold text-slate-900">{user.name || '未命名用户'}</div>
                <div className="text-sm text-slate-500">{user.email}</div>
                <div className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {user.role === 'owner' ? '所有者' : user.role === 'admin' ? '管理员' : '成员'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 用量记录 */}
        <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm mt-8">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-slate-900">用量记录</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-3">时间</th>
                  <th className="px-4 py-3">来源</th>
                  <th className="px-4 py-3">Tokens</th>
                  <th className="px-4 py-3">耗时</th>
                  {/* <th className="px-4 py-3">费用</th> */}
                </tr>
              </thead>
              <tbody>
                {usageList.map((item) => (
                  <tr key={item.id} className="bg-white border-b hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.agentName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.totalTokens}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {Number(item.latency).toFixed(2)}s
                    </td>
                    {/* <td className="px-4 py-3 whitespace-nowrap">
                      {item.totalPrice} {item.currency}
                    </td> */}
                  </tr>
                ))}
                {usageList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      {loading ? '加载中...' : '暂无记录'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {total > pageSize && (
            <div className="flex justify-center mt-4 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                上一页
              </Button>
              <span className="flex items-center text-sm text-slate-600">
                第 {page} 页 / 共 {Math.ceil(total / pageSize)} 页
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                disabled={page >= Math.ceil(total / pageSize) || loading}
              >
                下一页
              </Button>
            </div>
          )}
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </div>
  );
}
