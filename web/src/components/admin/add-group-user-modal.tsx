import { Modal } from 'antd';
import { useState, useEffect } from 'react';
import { userGroupsApi, type GroupUser } from '@/api/user-groups';
import { toast } from 'sonner';
import { Loader2, Search } from 'lucide-react';
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
  const [addedUserIds, setAddedUserIds] = useState<Set<string>>(new Set());
  const [removedUserIds, setRemovedUserIds] = useState<Set<string>>(new Set());
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
      setAddedUserIds(new Set());
      setRemovedUserIds(new Set());
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
    } finally {
      setLoading(false);
    }
  };


  const isUserChecked = (user: GroupUser) => {
    if (user.isMember) {
      return !removedUserIds.has(user.id);
    }
    return addedUserIds.has(user.id);
  };

  const toggleSelect = (user: GroupUser) => {
    if (user.isMember) {
      const newRemoved = new Set(removedUserIds);
      if (newRemoved.has(user.id)) {
        newRemoved.delete(user.id); // Re-check (cancel removal)
      } else {
        newRemoved.add(user.id); // Uncheck (mark for removal)
      }
      setRemovedUserIds(newRemoved);
    } else {
      const newAdded = new Set(addedUserIds);
      if (newAdded.has(user.id)) {
        newAdded.delete(user.id); // Uncheck (cancel addition)
      } else {
        newAdded.add(user.id); // Check (mark for addition)
      }
      setAddedUserIds(newAdded);
    }
  };

  const toggleSelectAll = () => {
    const allSelected = users.every(user => isUserChecked(user));
    
    const newAdded = new Set(addedUserIds);
    const newRemoved = new Set(removedUserIds);

    if (allSelected) {
      // Uncheck all on current page
      users.forEach(user => {
        if (user.isMember) {
          newRemoved.add(user.id);
        } else {
          newAdded.delete(user.id);
        }
      });
    } else {
      // Check all on current page
      users.forEach(user => {
        if (user.isMember) {
          newRemoved.delete(user.id);
        } else {
          newAdded.add(user.id);
        }
      });
    }
    setAddedUserIds(newAdded);
    setRemovedUserIds(newRemoved);
  };

  const isAllSelected = users.length > 0 && users.every(user => isUserChecked(user));

  const handleSubmit = async () => {
    if (addedUserIds.size === 0 && removedUserIds.size === 0) return;
    setSubmitting(true);
    try {
      await userGroupsApi.updateUsers(groupId, {
        add: Array.from(addedUserIds),
        remove: Array.from(removedUserIds),
      });
      toast.success('保存成功');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Save users error', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="添加用户"
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={896}
      centered
    >
      <div className="flex flex-col h-[600px] pt-4 -mx-6 -mb-6">
        <div className="flex gap-2 px-6 pb-4 border-b">
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

        <div className="flex-1 overflow-y-auto px-6 py-4">
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
                        checked={isUserChecked(user)}
                        onChange={() => toggleSelect(user)}
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

        <div className="border-t p-4 flex justify-between items-center bg-white rounded-b-lg">
             <div className="flex-1">
             {users.length > 0 && (
                <Pagination
                  currentPage={page}
                  totalItems={total}
                  pageSize={pageSize}
                  onPageChange={(p) => {
                    setPage(p);
                    fetchUsers(p, keyword);
                  }}
                />
              )}
             </div>
            <div className="flex gap-2 shrink-0">
                <Button variant="outline" onClick={onClose} disabled={submitting}>取消</Button>
                <Button onClick={handleSubmit} disabled={submitting || (addedUserIds.size === 0 && removedUserIds.size === 0)}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    保存
                </Button>
            </div>
        </div>
      </div>
    </Modal>
  );
}
