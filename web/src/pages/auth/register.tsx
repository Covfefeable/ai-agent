import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Bot, ArrowRight, Cpu, Lock, Sparkles } from 'lucide-react';
import { authApi } from '@/api/auth';

const registerSchema = z.object({
  name: z.string().min(2, '名字至少需要2个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少需要6个字符'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = 'Super Agent - 注册';
  }, []);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      window.reportEvent('register', {
        userId: response.user.id.toString(),
      });
      navigate('/');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || '注册失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white">
      {/* Left Panel - Form */}
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-12 xl:px-24">
        <div className="mx-auto w-full max-w-[400px]">
          {/* Logo & Header */}
          <div className="mb-10">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <Bot className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">创建账号</h1>
            <p className="mt-3 text-base text-slate-500">
              加入 Super Agent，体验下一代智能助手
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-slate-700">昵称</Label>
              <Input
                id="name"
                type="text"
                placeholder="您的昵称"
                className="h-11 border-slate-200 bg-slate-50 px-4 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                disabled={isLoading}
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="h-11 border-slate-200 bg-slate-50 px-4 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                disabled={isLoading}
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少6位字符"
                className="h-11 border-slate-200 bg-slate-50 px-4 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                disabled={isLoading}
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="再次输入密码"
                className="h-11 border-slate-200 bg-slate-50 px-4 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                disabled={isLoading}
                {...form.register('confirmPassword')}
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-xs text-red-500">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="group relative mt-2 h-11 w-full overflow-hidden rounded-xl bg-slate-900 text-base font-semibold text-white shadow-xl transition-all hover:bg-slate-800 hover:shadow-2xl disabled:opacity-70"
              disabled={isLoading}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? '注册中...' : '立即注册'}
                {!isLoading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
              </span>
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-slate-500">
            已有账号？{' '}
            <Link to="/login" className="font-semibold text-blue-600 transition-colors hover:text-blue-500">
              立即登录
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-slate-950 text-white lg:flex">
        {/* Background Grid & Glow */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-0 left-0 right-0 h-[500px] w-full bg-gradient-to-b from-blue-500/10 via-transparent to-transparent blur-3xl"></div>
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] bg-purple-500/20 blur-[100px]"></div>
        
        {/* Content */}
        <div className="relative z-10 max-w-[480px] px-8">
          <div className="mb-8 inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-300 backdrop-blur-md">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            <span>Developer-First Experience</span>
          </div>
          
          <h2 className="mb-8 text-4xl font-bold leading-relaxed tracking-tight lg:text-5xl">
            立即开启<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">智能之旅</span>
          </h2>
          
          <p className="mb-10 text-lg text-slate-400 leading-relaxed">
            打造属于您的超级智能助手。零门槛集成私有知识库，灵活配置多模型，让 AI 成为您最得力的工作伙伴。
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="group rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/20">
              <div className="mb-3 inline-flex rounded-lg bg-emerald-500/20 p-2.5 text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-100">多模型支持</h3>
              <p className="mt-1 text-sm text-slate-400">集成全球领先的大语言模型</p>
            </div>
            
            <div className="group rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/20">
              <div className="mb-3 inline-flex rounded-lg bg-orange-500/20 p-2.5 text-orange-400 ring-1 ring-inset ring-orange-500/20">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-100">数据隐私安全</h3>
              <p className="mt-1 text-sm text-slate-400">企业级加密与权限管控</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
