import { Modal } from 'antd';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface RechargeOption {
  type: 'fixed' | 'custom';
  price?: number;
  tokens?: number;
  label: string;
  discount?: number;
}

const RECHARGE_OPTIONS: RechargeOption[] = [
  { type: 'fixed', price: 1, tokens: 10, label: '10', discount: 1 },
  { type: 'fixed', price: 10, tokens: 100, label: '100', discount: 1 },
  { type: 'fixed', price: 47.5, tokens: 500, label: '500', discount: 0.95 },
  { type: 'fixed', price: 92, tokens: 1000, label: '1000', discount: 0.92 },
  { type: 'custom', label: '自定义金额' },
];

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RechargeModal({ isOpen, onClose }: RechargeModalProps) {
  const [selectedType, setSelectedType] = useState<number | 'custom'>(RECHARGE_OPTIONS[1].price!);
  const [customAmount, setCustomAmount] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedType(RECHARGE_OPTIONS[1].price!);
      setCustomAmount('');
    }
  }, [isOpen]);

  const customInfo = useMemo(() => {
    const amount = Number(customAmount);
    if (!amount || amount < 1 || !Number.isInteger(amount)) return null;

    let discount = 1;
    if (amount >= 100) discount = 0.92;
    else if (amount >= 50) discount = 0.95;

    const price = amount * discount;
    const tokens = amount * 10; // 1元 = 10点数

    return {
      price,
      originalPrice: amount,
      tokens,
      discount
    };
  }, [customAmount]);

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
          {RECHARGE_OPTIONS.map((option) => {
            if (option.type === 'custom') {
              const isSelected = selectedType === 'custom';
              return (
                <div
                  key="custom"
                  onClick={() => setSelectedType('custom')}
                  className={cn(
                    "col-span-2 relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-slate-400 bg-slate-50/50",
                    isSelected
                      ? "border-slate-900 bg-slate-100"
                      : "border-transparent ring-1 ring-slate-200"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 left-2 text-slate-900">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  <div className="w-full max-w-xs flex flex-col items-center gap-3">
                    <div className="text-base font-medium text-slate-900">自定义充值金额</div>
                    <div className="relative w-full">
                      <Input
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="请输入充值金额（元）"
                        className="pr-8 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min={1}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">元</span>
                    </div>
                    {customInfo ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-slate-900">¥{customInfo.price.toFixed(2)}</span>
                          {customInfo.discount < 1 && (
                            <span className="text-sm text-slate-400 line-through">¥{customInfo.originalPrice}</span>
                          )}
                        </div>
                        {customInfo.discount < 1 && (
                          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-medium">
                            限时 {Math.round(customInfo.discount * 100) / 10} 折
                          </span>
                        )}
                        <div className="text-sm text-slate-500">
                          获得 <span className="font-medium text-slate-900">{customInfo.tokens.toLocaleString()}</span> 点数
                        </div>
                      </div>
                    ) : (
                      <div className="h-[76px] flex items-center justify-center text-sm text-slate-400">
                        输入金额自动计算折扣
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            const isSelected = selectedType === option.price;
            return (
              <div
                key={option.price}
                onClick={() => setSelectedType(option.price!)}
                className={cn(
                  "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-slate-400 bg-slate-50/50",
                  isSelected
                    ? "border-slate-900 bg-slate-100"
                    : "border-transparent ring-1 ring-slate-200"
                )}
              >
                {option.discount! < 1 && (
                  <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg font-bold">
                    {(option.discount! * 10).toFixed(1).replace('.0', '')}折
                  </div>
                )}
                {isSelected && (
                  <div className="absolute top-2 left-2 text-slate-900">
                    <Check className="w-4 h-4" />
                  </div>
                )}
                <div className="text-2xl font-bold text-slate-900 mb-1 flex items-baseline gap-2">
                  <span>￥{option.price}</span>
                  {option.discount! < 1 && (
                    <span className="text-sm font-normal text-slate-400 line-through decoration-slate-400">
                      ￥{Math.ceil(option.price! / option.discount!)}
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium text-slate-500">
                  {option.label} 点数
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button 
            onClick={handleConfirm} 
            className="bg-slate-900 hover:bg-slate-800 text-white min-w-[100px]"
            disabled={selectedType === 'custom' && (!customInfo)}
          >
            立即支付
          </Button>
        </div>
      </div>
    </Modal>
  );
}
