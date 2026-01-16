import { Bot, Check, ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, Popover } from 'antd';
import { type Model } from '@/api/models';

interface ModelSelectorProps {
  models: Model[];
  selectedModelId: string;
  onModelSelect: (modelId: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModelSelector({
  models,
  selectedModelId,
  onModelSelect,
  open,
  onOpenChange
}: ModelSelectorProps) {
  const current = models.find(m => m.modelId === selectedModelId);

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      placement="topLeft"
      trigger="click"
      overlayInnerStyle={{ padding: 0 }}
      content={
        <div className="w-60 p-1">
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {models.map(model => (
              <button
                key={model.id}
                onClick={() => {
                  onModelSelect(model.modelId);
                  onOpenChange(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                  selectedModelId === model.modelId 
                    ? "bg-blue-50 text-blue-600" 
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                {model.iconUrl ? (
                  <img src={model.iconUrl} alt="" className="h-4 w-4 rounded object-cover" />
                ) : (
                  <div className="flex h-4 w-4 items-center justify-center rounded bg-slate-100">
                    <Bot className="h-3 w-3 text-slate-500" />
                  </div>
                )}
                <span className="truncate flex-1">
                  {model.name}
                </span>
                {model.multiplier <= 0 ? (
                  <span className="shrink-0 inline-flex items-center rounded bg-green-100 px-1 py-0.5 text-[10px] font-bold text-green-600">
                    Free
                  </span>
                ) : model.multiplier !== 1 ? (
                  <Tooltip
                    title={<p>结算 Token 数 = 实际消耗量 × 倍率</p>}
                    placement="top"
                  >
                    <span className={cn(
                      "shrink-0 inline-flex items-center rounded px-1 py-0.5 text-[10px] font-bold cursor-help",
                      model.multiplier > 1 
                        ? "bg-orange-100 text-orange-600"
                        : "bg-blue-100 text-blue-600"
                    )}>
                      {model.multiplier}x
                    </span>
                  </Tooltip>
                ) : null}
                {selectedModelId === model.modelId && <Check className="shrink-0 h-3 w-3" />}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <button
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-all"
        title="选择模型"
      >
        {current?.iconUrl ? (
          <img src={current.iconUrl} alt="" className="h-3.5 w-3.5 rounded object-cover" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-blue-600" />
        )}
        <span className="max-w-[100px] truncate">{current?.name || '选择模型'}</span>
        {current?.multiplier !== undefined && (
          current.multiplier <= 0 ? (
            <span className="shrink-0 rounded bg-green-100 px-1 text-[10px] font-bold text-green-600">
              Free
            </span>
          ) : current.multiplier !== 1 ? (
            <Tooltip
              title={<p>结算 Token 数 = 实际消耗量 × 倍率</p>}
              placement="top"
            >
              <span className={cn(
                "shrink-0 rounded px-1 text-[10px] font-bold cursor-help",
                current.multiplier > 1 
                  ? "bg-orange-100 text-orange-600"
                  : "bg-blue-100 text-blue-600"
              )}>
                {current.multiplier}x
              </span>
            </Tooltip>
          ) : null
        )}
        <ChevronDown className="shrink-0 h-3 w-3 text-slate-400" />
      </button>
    </Popover>
  );
}
