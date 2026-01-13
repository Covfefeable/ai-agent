import { useState, useEffect } from 'react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn';
import locale from 'antd/es/date-picker/locale/zh_CN';
import { PvUvChart } from '@/components/admin/analytics/pv-uv-chart';
import { TopPagesChart } from '@/components/admin/analytics/top-pages-chart';
import { UserAgentChart } from '@/components/admin/analytics/user-agent-chart';
import { analyticsApi, type VisitData, type TopPageData, type BrowserData } from '@/api/analytics';

const { RangePicker } = DatePicker;

export function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);
  const [visitData, setVisitData] = useState<VisitData[]>([]);
  const [topPagesData, setTopPagesData] = useState<TopPageData[]>([]);
  const [browserData, setBrowserData] = useState<BrowserData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (range?: [Dayjs, Dayjs]) => {
    try {
      setLoading(true);
      const [start, end] = range || dateRange;
      const res = await analyticsApi.getStats(
        start.format('YYYY-MM-DD'),
        end.format('YYYY-MM-DD')
      );
      if (res) {
        setVisitData(res.visit || []);
        setTopPagesData(res.topPages || []);
        setBrowserData(res.browser || []);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setVisitData([]);
      setTopPagesData([]);
      setBrowserData([]);
    } finally {
      setLoading(false);
    }
  };

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
                const newRange = [dates[0], dates[1]] as [Dayjs, Dayjs];
                setDateRange(newRange);
                fetchData(newRange);
              }
            }}
            className="w-64"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PvUvChart data={visitData} loading={loading} />
          <TopPagesChart data={topPagesData} loading={loading} />
          <UserAgentChart data={browserData} loading={loading} />
        </div>
      </div>
    </div>
  );
}
