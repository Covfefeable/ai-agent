import React from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = '确定',
  cancelText = '取消',
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      <div 
        className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {description && (
          <div className="mt-2 text-sm text-slate-500">
            {description}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="h-9 px-4 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            {cancelText}
          </Button>
          <Button
            variant="default"
            onClick={onConfirm}
            isLoading={isLoading}
            className={cn(
              "h-9 px-4 text-white shadow-none",
              variant === 'destructive' 
                ? "bg-red-600 hover:bg-red-700" 
                : "bg-slate-900 hover:bg-slate-800"
            )}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
