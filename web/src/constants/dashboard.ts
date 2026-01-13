import { LogOut, User, Settings, Bot, BarChart } from 'lucide-react';

export const routeTitles = [
  { path: '/', title: 'Super Agent - 对话', exact: true },
  { path: '/chat/', title: 'Super Agent - 对话', prefix: true },
  { path: '/knowledge', title: 'Super Agent - 知识库', exact: true },
  { path: '/knowledge/', title: 'Super Agent - 知识库详情', prefix: true },
  { path: '/agents-square', title: 'Super Agent - 智能体广场', exact: true },
  { path: '/agents-square/', title: 'Super Agent - 智能体对话', prefix: true },
  { path: '/users', title: 'Super Agent - 用户管理', exact: true },
  { path: '/agents', title: 'Super Agent - 智能体管理', exact: true },
  { path: '/agent-categories', title: 'Super Agent - 智能体分类', exact: true },
  { path: '/models', title: 'Super Agent - 模型管理', exact: true },
  { path: '/analytics', title: 'Super Agent - 数据分析', exact: true },
  { path: '/admin', title: 'Super Agent - 后台管理', exact: true },
  { path: '/profile', title: 'Super Agent - 个人中心', exact: true },
  { path: '/login', title: 'Super Agent - 登录', exact: true },
  { path: '/register', title: 'Super Agent - 注册', exact: true },
];

export const profileMenuItems = [
  {
    label: '个人中心',
    icon: User,
    path: '/profile',
    separator: true
  },
  {
    label: '智能体管理',
    icon: Bot,
    path: '/agents',
    separator: true
  },
  {
    label: '数据分析',
    icon: BarChart,
    path: '/analytics',
    roles: ['owner', 'admin'],
    separator: true
  },
  {
    label: '后台管理',
    icon: Settings,
    path: '/admin',
    roles: ['owner', 'admin'],
    separator: true
  },
  {
    label: '退出登录',
    icon: LogOut,
    action: 'logout',
    className: 'text-red-600 focus:text-red-700 focus:bg-red-50'
  }
];
