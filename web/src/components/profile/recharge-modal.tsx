import { Modal } from 'antd';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface RechargeOption {
  price: number;
  tokens: number;
  label: string;
}

const RECHARGE_OPTIONS: RechargeOption[] = [
  { price: 1, tokens: 100000, label: '100k' },
  { price: 10, tokens: 1000000, label: '1000k' },
  { price: 50, tokens: 5000000, label: '5000k' },
  { price: 100, tokens: 10000000, label: '10000k' },
];

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RechargeModal({ isOpen, onClose }: RechargeModalProps) {
  const [selectedPrice, setSelectedPrice] = useState<number>(RECHARGE_OPTIONS[1].price);

  const handleConfirm = () => {
    // 暂时不做实际处理，直接关闭
    onClose();
  };

  return (
    <Modal
      title="充值"
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
    >
      <div className="pt-4 pb-2">
        <div className="grid grid-cols-2 gap-4 mb-8">
          {RECHARGE_OPTIONS.map((option) => (
            <div
              key={option.price}
              onClick={() => setSelectedPrice(option.price)}
              className={cn(
                "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-slate-400 bg-slate-50/50",
                selectedPrice === option.price
                  ? "border-slate-900 bg-slate-100"
                  : "border-transparent ring-1 ring-slate-200"
              )}
            >
              {selectedPrice === option.price && (
                <div className="absolute top-2 right-2 text-slate-900">
                  <Check className="w-4 h-4" />
                </div>
              )}
              <div className="text-2xl font-bold text-slate-900 mb-1">
                ￥{option.price}
              </div>
              <div className="text-sm font-medium text-slate-500">
                {option.label} Tokens
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleConfirm} className="bg-slate-900 hover:bg-slate-800 text-white min-w-[100px]">
            立即支付
          </Button>
        </div>
      </div>
    </Modal>
  );
}
