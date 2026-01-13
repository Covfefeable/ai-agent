import { useState } from 'react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn';
import locale from 'antd/es/date-picker/locale/zh_CN';
import { PvUvChart } from '@/components/admin/analytics/pv-uv-chart';

const { RangePicker } = DatePicker;

export function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex h-16 items-center justify-between border-b border-slate-100 pl-14 pr-4 md:px-8">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800 whitespace-nowrap">数据分析</h2>
          <RangePicker
            locale={locale}
            value={dateRange}
            onChange={(dates) => {
              // Ant Design DatePicker dates can be null, but we initialize with valid dates
              // and the UI usually enforces selection or clearing both
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]] as [Dayjs, Dayjs]);
              }
            }}
            className="w-64"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PvUvChart dateRange={dateRange} />
        </div>
      </div>
    </div>
  );
}
