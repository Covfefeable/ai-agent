import { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChangePasswordModal } from '@/components/profile/change-password-modal';

export function ProfilePage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

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
      </div>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </div>
  );
}
