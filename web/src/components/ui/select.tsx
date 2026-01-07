import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Click inside container or dropdown should not close immediately (handled by onClick)
      // We only care about clicks OUTSIDE both
      if (
        containerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleScroll = () => {
      if (open) setOpen(false);
    };

    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', handleScroll, true); // Capture phase to catch all scrolls
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open]);

  const handleToggle = () => {
    if (disabled) return;
    
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
    setOpen(!open);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
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

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: position.width,
          }}
          className="z-[9999] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
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
        </div>,
        document.body
      )}
    </div>
  );
}
