import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModelsList } from "./models"
import { UsersList } from "./users"
import { CategoriesList } from "./categories"

export function AdminPage() {
  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex h-16 items-center justify-between border-b border-slate-100 pl-14 pr-4 md:px-8">
        <h2 className="text-lg font-bold text-slate-800">后台管理</h2>
      </header>
      <div className="flex-1 overflow-hidden p-4 md:p-8">
        <Tabs defaultValue="models" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
            <TabsTrigger value="models">模型管理</TabsTrigger>
            <TabsTrigger value="users">用户管理</TabsTrigger>
            <TabsTrigger value="categories">分类管理</TabsTrigger>
          </TabsList>
          <TabsContent value="models" className="flex-1 overflow-hidden mt-4 border rounded-xl p-0">
             <ModelsList className="h-full" />
          </TabsContent>
          <TabsContent value="users" className="flex-1 overflow-hidden mt-4 border rounded-xl p-0">
             <UsersList className="h-full" />
          </TabsContent>
          <TabsContent value="categories" className="flex-1 overflow-hidden mt-4 border rounded-xl p-0">
             <CategoriesList className="h-full" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
