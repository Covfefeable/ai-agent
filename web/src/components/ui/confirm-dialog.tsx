import React from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { Modal } from 'antd';

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
  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={384}
      centered
      closable={false}
      className="confirm-dialog"
    >
      <div className="pt-2">
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
    </Modal>
  );
}
