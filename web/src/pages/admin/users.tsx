import { useState, useEffect } from 'react';
import { usersApi, type User } from '@/api/users';
import { toast } from 'sonner';
import { Loader2, Shield, User as UserIcon, ShieldAlert, Search } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { format } from 'date-fns';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    fetchUsers();
  }, [debouncedKeyword, currentPage]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await usersApi.getUsers(debouncedKeyword, currentPage, pageSize);
      setUsers(response.data);
      setTotalItems(response.total);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Failed to fetch users:', msg);
      toast.error('获取用户列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'member') => {
    try {
      await usersApi.updateRole(userId, newRole);
      toast.success('角色更新成功');
      fetchUsers();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Update role failed:', msg);
      toast.error('角色更新失败');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
            <ShieldAlert className="h-3 w-3" />
            所有者
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            <Shield className="h-3 w-3" />
            管理员
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
            <UserIcon className="h-3 w-3" />
            普通用户
          </span>
        );
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex h-16 items-center border-b border-slate-100 pl-14 pr-4 md:px-8">
        <h2 className="text-lg font-bold text-slate-800 whitespace-nowrap">用户管理</h2>
        <div className="relative ml-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜索..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="h-9 w-32 md:w-64 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">用户</th>
                      <th className="px-6 py-4 font-medium">邮箱</th>
                      <th className="px-6 py-4 font-medium">角色</th>
                      <th className="px-6 py-4 font-medium">余额</th>
                      <th className="px-6 py-4 font-medium">注册时间</th>
                      <th className="px-6 py-4 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                        <td className="px-6 py-4 text-slate-600">{user.email}</td>
                        <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                        <td className="px-6 py-4 text-slate-600">
                          {['owner', 'admin'].includes(user.role) ? '不限制' : user.balance?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {user.createdAt ? format(new Date(user.createdAt), 'yyyy-MM-dd HH:mm') : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {user.role !== 'owner' && (
                            <div className="inline-block w-40">
                              <Select
                                options={[
                                  { label: '设为普通用户', value: 'member' },
                                  { label: '设为管理员', value: 'admin' },
                                ]}
                                value={user.role}
                                onChange={(val: string) => handleRoleChange(user.id, val as 'admin' | 'member')}
                                className="w-full"
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              className="justify-end mt-4"
            />
          </>
        )}
      </div>
    </div>
  );
}
