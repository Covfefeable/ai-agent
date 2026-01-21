import { cn } from '@/lib/utils';
import { AppLogo } from '../icons/app-logo';

interface LoadingProps {
  className?: string;
  iconClassName?: string;
}

export function Loading({ className, iconClassName }: LoadingProps) {
  return (
    <div className={cn("flex h-64 items-center justify-center", className)}>
      <AppLogo className={cn("h-8 w-8 text-slate-400 animate-pulse", iconClassName)} />
    </div>
  );
}
