import { useState, useEffect, useRef } from 'react';
import { User, Lock, Camera, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SimpleTooltip } from "@/components/ui/tooltip";
import { Pagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { ChangePasswordModal } from '@/components/profile/change-password-modal';
import { userApi } from '@/api/user';
import { toast } from 'sonner';

interface UsageItem {
  id: string;
  agentName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  calculatedTotalTokens?: number;
  latency: string;
  totalPrice: string;
  currency: string;
  createdAt: string;
}

export function ProfilePage() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [usageList, setUsageList] = useState<UsageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
    fetchUsage();
  }, [page]);

  const fetchProfile = async () => {
    try {
      const res = await userApi.getProfile();
      setUser(res);
      localStorage.setItem('user', JSON.stringify(res));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast.error('图片大小不能超过 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        await userApi.updateAvatar(base64);
        toast.success('头像更新成功');
        fetchProfile(); // Refresh profile
      } catch (error) {
        console.error('Failed to update avatar:', error);
        toast.error('头像上传失败');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStartEditName = () => {
    setNameInput(user.name);
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setNameInput('');
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      toast.error('昵称不能为空');
      return;
    }
    try {
      await userApi.updateInfo({ name: nameInput });
      toast.success('昵称修改成功');
      setIsEditingName(false);
      fetchProfile();
    } catch (error) {
      console.error('Failed to update name:', error);
      toast.error('昵称修改失败');
    }
  };

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
              <div 
                className="group relative flex h-24 w-24 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-400 overflow-hidden ring-4 ring-white shadow-sm transition-all hover:ring-slate-100"
                onClick={handleAvatarClick}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-12 w-12" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-8 w-8 text-white" />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="h-8 w-48"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName();
                          if (e.key === 'Escape') handleCancelEditName();
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={handleSaveName}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100" onClick={handleCancelEditName}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/name min-w-0">
                      <SimpleTooltip 
                        trigger={
                          <h1 className="text-2xl font-bold text-slate-900 truncate cursor-default max-w-full">
                            {user.name || '未命名用户'}
                          </h1>
                        }
                        content={<p>{user.name || '未命名用户'}</p>}
                      />
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 shrink-0 text-slate-400 hover:text-slate-600"
                        onClick={handleStartEditName}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  
                  {!isEditingName && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${
                      user.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {user.role === 'owner' ? '所有者' : user.role === 'admin' ? '管理员' : '成员'}
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-500">{user.email}</div>
                <div className="text-sm font-medium text-slate-600 pt-1">
                  余额: <span className="text-slate-900">{['owner', 'admin'].includes(user.role) ? '∞' : `${user.balance?.toLocaleString() || 0} Tokens`}</span>
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
                  <th className="px-4 py-3">结算token</th>
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
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                      {item.calculatedTotalTokens ?? item.totalTokens}
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
          
          <div className="flex justify-end mt-4">
            <Pagination
              currentPage={page}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </div>
  );
}
