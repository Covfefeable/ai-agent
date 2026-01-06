import * as React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 active:scale-95';
    
    const variants = {
      default: 'bg-slate-900 text-slate-50 hover:bg-slate-800 shadow-sm',
      outline: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm',
      ghost: 'hover:bg-slate-100 text-slate-600',
      link: 'text-slate-900 underline-offset-4 hover:underline',
    };

    const sizes = {
      default: 'h-11 px-6 py-2',
      sm: 'h-9 rounded-lg px-3',
      lg: 'h-12 rounded-2xl px-10 text-base',
      icon: 'h-11 w-11',
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
