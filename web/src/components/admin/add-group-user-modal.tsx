import { useState, useEffect } from 'react';
import { userGroupsApi, type GroupUser } from '@/api/user-groups';
import { toast } from 'sonner';
import { X, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { UserGroupsDisplay } from '@/components/admin/user-groups-display';

interface AddGroupUserModalProps {
  isOpen: boolean;
  groupId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddGroupUserModal({ isOpen, groupId, onClose, onSuccess }: AddGroupUserModalProps) {
  const [users, setUsers] = useState<GroupUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers(page, debouncedKeyword);
    }
  }, [page, debouncedKeyword, isOpen, groupId]);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setKeyword('');
      setDebouncedKeyword('');
      setSelectedUserIds(new Set());
    }
  }, [isOpen]);

  const fetchUsers = async (pageNum: number, searchKeyword: string) => {
    setLoading(true);
    try {
      const res = await userGroupsApi.getUsers(groupId, pageNum, pageSize, searchKeyword);
      setUsers(res.data);
      setTotal(res.total);
    } catch (error) {
      console.error('Fetch users error', error);
      toast.error('加载用户失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // No-op, handled by debounce
  };

  const toggleSelect = (userId: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUserIds(newSet);
  };

  const toggleSelectAll = () => {
    const newSet = new Set(selectedUserIds);
    const availableUsers = users.filter(user => !user.isMember);
    const allSelected = availableUsers.every(user => newSet.has(user.id));

    if (allSelected) {
      availableUsers.forEach(user => newSet.delete(user.id));
    } else {
      availableUsers.forEach(user => newSet.add(user.id));
    }
    setSelectedUserIds(newSet);
  };

  const isAllSelected = users.length > 0 && users.filter(user => !user.isMember).every(user => selectedUserIds.has(user.id));

  const handleSubmit = async () => {
    if (selectedUserIds.size === 0) return;
    setSubmitting(true);
    try {
      await userGroupsApi.addUsers(groupId, Array.from(selectedUserIds));
      toast.success('添加用户成功');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Add users error', error);
      toast.error('添加用户失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-4xl flex flex-col max-h-[85vh] rounded-xl bg-white shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b p-6 pb-4">
          <h3 className="text-lg font-bold text-slate-900">添加用户</h3>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 p-6 pb-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索用户..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
             <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-500">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      disabled={users.every(user => user.isMember)}
                      className="h-4 w-4 rounded border-slate-300 accent-black disabled:opacity-50"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">用户</th>
                  <th className="px-4 py-3 font-medium">邮箱</th>
                  <th className="px-4 py-3 font-medium">用户组</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y border-b">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(user.id)}
                        onChange={() => toggleSelect(user.id)}
                        disabled={user.isMember}
                        className="h-4 w-4 rounded border-slate-300 accent-black disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-100">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-500">
                              {user.name.slice(0, 1)}
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-slate-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{user.email}</td>
                    <td className="px-4 py-3">
                      <UserGroupsDisplay groups={user.groups} />
                    </td>
                    <td className="px-4 py-3">
                      {user.isMember ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          已加入
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          未加入
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                   <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      暂无数据
                    </td>
                   </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t p-4 flex justify-between items-center">
             <Pagination
                currentPage={page}
                totalItems={total}
                pageSize={pageSize}
                onPageChange={(p) => {
                  setPage(p);
                  fetchUsers(p, keyword);
                }}
              />
            <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={submitting}>取消</Button>
                <Button onClick={handleSubmit} disabled={submitting || selectedUserIds.size === 0}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    确定添加 ({selectedUserIds.size})
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
