import { AppLogo } from '@/components/icons/app-logo';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <AppLogo className="shrink-0 text-black" width="40" height="40" />
      <span className="text-xl font-bold text-slate-900 tracking-tight">Super Agent</span>
    </div>
  );
}
