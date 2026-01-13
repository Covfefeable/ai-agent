import { useState, useEffect } from 'react';
import { userGroupsApi, type UserGroup } from '@/api/user-groups';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, UserPlus, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { UserGroupModal } from '@/components/admin/user-group-modal';
import { AddGroupUserModal } from '@/components/admin/add-group-user-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import dayjs from 'dayjs';

export function UserGroupsList({ className }: { className?: string }) {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | undefined>(undefined);

  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [addUserGroupId, setAddUserGroupId] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<UserGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await userGroupsApi.list(page, pageSize, debouncedKeyword);
      setGroups(res.data);
      setTotal(res.total);
    } catch (error) {
      console.error('Fetch groups error', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [page, debouncedKeyword]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleCreate = () => {
    setModalMode('create');
    setSelectedGroup(undefined);
    setModalOpen(true);
  };

  const handleEdit = (group: UserGroup) => {
    setModalMode('edit');
    setSelectedGroup(group);
    setModalOpen(true);
  };

  const handleDelete = (group: UserGroup) => {
    setGroupToDelete(group);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!groupToDelete) return;
    setDeleting(true);
    try {
      await userGroupsApi.remove(groupToDelete.id);
      toast.success('删除用户组成功');
      setDeleteDialogOpen(false);
      fetchGroups();
    } catch (error) {
      console.error('Delete group error', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleAddUsers = (group: UserGroup) => {
    setAddUserGroupId(group.id);
    setAddUserModalOpen(true);
  };

  return (
    <div className={`flex h-full flex-col bg-white ${className}`}>
      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索用户组..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="h-9 w-64 rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
          <Button onClick={handleCreate} className="gap-2" size="sm">
            <Plus className="h-4 w-4" />
            新建用户组
          </Button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">用户组名称</th>
                  <th className="px-6 py-4 font-medium">用户数</th>
                  <th className="px-6 py-4 font-medium">创建时间</th>
                  <th className="px-6 py-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y border-b">
                {groups.map((group) => (
                  <tr key={group.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{group.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Users className="h-4 w-4 text-slate-400" />
                        {group.userCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {dayjs(group.createdAt).format('YYYY-MM-DD HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleAddUsers(group)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-black/5 hover:text-black"
                        title="添加用户"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(group)}
                        className="ml-2 rounded-lg p-1.5 text-slate-400 hover:bg-black/5 hover:text-black"
                        title="编辑"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(group)}
                        className="ml-2 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {groups.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      暂无用户组
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Pagination
            currentPage={page}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      </div>

      <UserGroupModal
        isOpen={modalOpen}
        mode={modalMode}
        initialData={selectedGroup}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchGroups}
      />

      <AddGroupUserModal
        isOpen={addUserModalOpen}
        groupId={addUserGroupId}
        onClose={() => setAddUserModalOpen(false)}
        onSuccess={fetchGroups}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="删除用户组"
        description="确定要删除这个用户组吗？此操作无法撤销，组内用户关联将被移除。"
        confirmText="删除"
        variant="destructive"
        isLoading={deleting}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
