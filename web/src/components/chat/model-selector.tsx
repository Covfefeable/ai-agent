import { Bot, Check, ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SimpleTooltip } from '@/components/ui/tooltip';
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
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
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
          {current?.multiplier && current.multiplier > 1 && (
            <SimpleTooltip
              trigger={
                <span className="rounded bg-orange-100 px-1 text-[10px] font-bold text-orange-600 cursor-help">
                  {current.multiplier}x
                </span>
              }
              content={<p>结算 Token 数 = 实际消耗量 × 倍率</p>}
            />
          )}
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start" side="top" sideOffset={8}>
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
                {model.multiplier > 1 && (
                  <SimpleTooltip
                    trigger={
                      <span className="ml-1.5 inline-flex items-center rounded bg-orange-100 px-1 py-0.5 text-[10px] font-bold text-orange-600 cursor-help">
                        {model.multiplier}x
                      </span>
                    }
                    content={<p>结算 Token 数 = 实际消耗量 × 倍率</p>}
                  />
                )}
              </span>
              {selectedModelId === model.modelId && <Check className="h-3 w-3" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
