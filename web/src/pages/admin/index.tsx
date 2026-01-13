import { Segmented } from "antd"
import { useState } from "react"
import { ModelsList } from "./models"
import { UsersList } from "./users"
import { UserGroupsList } from "./user-groups"
import { CategoriesList } from "./categories"

export function AdminPage() {
  const [activeTab, setActiveTab] = useState('models');

  const renderContent = () => {
    switch (activeTab) {
      case 'models':
        return <ModelsList className="h-full" />;
      case 'categories':
        return <CategoriesList className="h-full" />;
      case 'users':
        return <UsersList className="h-full" />;
      case 'user-groups':
        return <UserGroupsList className="h-full" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex h-16 items-center justify-between border-b border-slate-100 pl-14 pr-4 md:px-8">
        <h2 className="text-lg font-bold text-slate-800">后台管理</h2>
      </header>
      <div className="flex-1 overflow-hidden p-4 md:p-8 flex flex-col">
        <div>
          <Segmented
            value={activeTab}
            onChange={(value) => setActiveTab(value as string)}
            options={[
              { label: '模型管理', value: 'models' },
              { label: '分类管理', value: 'categories' },
              { label: '用户管理', value: 'users' },
              { label: '用户组管理', value: 'user-groups' },
            ]}
          />
        </div>
        <div className="flex-1 overflow-hidden h-full border rounded-xl p-0 mt-4">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
