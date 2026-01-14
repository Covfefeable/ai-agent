import { Card } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatisticCardProps {
  title: string;
  value: number;
  change: number | null;
  loading?: boolean;
}

export function StatisticCard({ title, value, change, loading = false }: StatisticCardProps) {
  return (
    <Card className="p-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-slate-500">{title}</span>
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-slate-100" />
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-bold text-slate-900">
              {value.toLocaleString()}
            </span>
            {change !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">环比</span>
                <div className={cn(
                  "flex items-center text-xs font-medium",
                  change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-slate-500"
                )}>
                  {change > 0 ? (
                    <ArrowUp className="h-3 w-3 mr-0.5" />
                  ) : change < 0 ? (
                    <ArrowDown className="h-3 w-3 mr-0.5" />
                  ) : (
                    <Minus className="h-3 w-3 mr-0.5" />
                  )}
                  {Math.abs(change)}%
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
