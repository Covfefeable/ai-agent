import { Modal } from 'antd';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface RechargeOption {
  price: number;
  tokens: number;
  label: string;
  discount: number;
}

const RECHARGE_OPTIONS: RechargeOption[] = [
  { price: 1, tokens: 10, label: '10', discount: 1 },
  { price: 10, tokens: 100, label: '100', discount: 1 },
  { price: 47.5, tokens: 500, label: '500', discount: 0.95 },
  { price: 92, tokens: 1000, label: '1000', discount: 0.92 },
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
              {option.discount < 1 && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg font-bold">
                  {(option.discount * 10).toFixed(1).replace('.0', '')}折
                </div>
              )}
              {selectedPrice === option.price && (
                <div className="absolute top-2 left-2 text-slate-900">
                  <Check className="w-4 h-4" />
                </div>
              )}
              <div className="text-2xl font-bold text-slate-900 mb-1 flex items-baseline gap-2">
                <span>￥{option.price}</span>
                {option.discount < 1 && (
                  <span className="text-sm font-normal text-slate-400 line-through decoration-slate-400">
                    ￥{Math.ceil(option.price / option.discount)}
                  </span>
                )}
              </div>
              <div className="text-sm font-medium text-slate-500">
                {option.label} 点数
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
