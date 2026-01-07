import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string;
  iconUrl?: string | null;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Select({ options, value, onChange, placeholder, className, disabled }: SelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-sm transition-all',
          'placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 focus-visible:border-slate-400',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <div className="flex items-center gap-2 text-left">
          {selected?.iconUrl ? (
            <img src={selected.iconUrl} alt="" className="h-6 w-6 rounded-lg object-cover" />
          ) : null}
          <span className={cn('truncate', !selected && 'text-slate-400')}>
            {selected ? selected.label : (placeholder || '请选择')}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <ul className="max-h-56 overflow-auto py-1">
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors',
                    opt.value === value ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                  )}
                  onClick={() => {
                    onChange?.(opt.value);
                    setOpen(false);
                  }}
                >
                  {opt.iconUrl ? (
                    <img src={opt.iconUrl} alt="" className="h-6 w-6 rounded-lg object-cover" />
                  ) : null}
                  <span className="truncate">{opt.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
