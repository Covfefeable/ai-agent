import { useState, useEffect } from 'react';
import { DatePicker, Segmented } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn';
import locale from 'antd/es/date-picker/locale/zh_CN';
import { PvUvChart } from '@/components/admin/analytics/pv-uv-chart';
import { TopPagesChart } from '@/components/admin/analytics/top-pages-chart';
import { UserAgentChart } from '@/components/admin/analytics/user-agent-chart';
import { OsChart } from '@/components/admin/analytics/os-chart';
import { DeviceChart } from '@/components/admin/analytics/device-chart';
import { UserGrowthChart } from '@/components/admin/analytics/user-growth-chart';
import { CumulativeUsersChart } from '@/components/admin/analytics/cumulative-users-chart';
import { ActiveHoursChart } from '@/components/admin/analytics/active-hours-chart';
import { StatisticCard } from '@/components/admin/analytics/statistic-card';
import { analyticsApi, type VisitData, type TopPageData, type BrowserData, type OsData, type DeviceData, type UserGrowthData, type ActiveHoursData, type SummaryData, type CumulativeUserData } from '@/api/analytics';

const { RangePicker } = DatePicker;

const rangePresets: {
  label: string;
  value: [Dayjs, Dayjs];
}[] = [
  { label: '当日', value: [dayjs(), dayjs()] },
  { label: '近一周', value: [dayjs().subtract(6, 'day'), dayjs()] },
  { label: '近一个月', value: [dayjs().subtract(29, 'day'), dayjs()] },
  { label: '近三个月', value: [dayjs().subtract(89, 'day'), dayjs()] },
];

export function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(6, 'day'),
    dayjs(),
  ]);
  const [activeTab, setActiveTab] = useState<'visit' | 'profile'>('visit');
  
  const [visitData, setVisitData] = useState<VisitData[]>([]);
  const [topPagesData, setTopPagesData] = useState<TopPageData[]>([]);
  const [browserData, setBrowserData] = useState<BrowserData[]>([]);
  const [osData, setOsData] = useState<OsData[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthData[]>([]);
  const [cumulativeUsersData, setCumulativeUsersData] = useState<CumulativeUserData[]>([]);
  const [activeHoursData, setActiveHoursData] = useState<ActiveHoursData[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dateRange[0] && dateRange[1]) {
      fetchData(dateRange, activeTab);
    }
  }, [dateRange, activeTab]);

  const fetchData = async (range: [Dayjs, Dayjs], type: 'visit' | 'profile') => {
    try {
      setLoading(true);
      const [start, end] = range;
      
      if (type === 'visit') {
        const [res, summaryRes] = await Promise.all([
          analyticsApi.getStats(
            start.format('YYYY-MM-DD'),
            end.format('YYYY-MM-DD'),
            type
          ),
          analyticsApi.getSummary(
            start.format('YYYY-MM-DD'),
            end.format('YYYY-MM-DD')
          )
        ]);

        if (res) {
          setVisitData(res.visit || []);
          setTopPagesData(res.topPages || []);
          setUserGrowthData(res.userGrowth || []);
          setCumulativeUsersData(res.cumulativeUsers || []);
        }
        setSummaryData(summaryRes || null);
      } else {
        const res = await analyticsApi.getStats(
          start.format('YYYY-MM-DD'),
          end.format('YYYY-MM-DD'),
          type
        );
        
        if (res) {
          setBrowserData(res.browser || []);
          setOsData(res.os || []);
          setDeviceData(res.device || []);
          setActiveHoursData(res.activeHours || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      if (type === 'visit') {
        setVisitData([]);
        setTopPagesData([]);
        setUserGrowthData([]);
        setCumulativeUsersData([]);
        setSummaryData(null);
      } else {
        setBrowserData([]);
        setOsData([]);
        setDeviceData([]);
        setActiveHoursData([]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex h-16 items-center justify-between border-b border-slate-100 pl-14 pr-4 md:px-8">
        <h2 className="text-lg font-bold text-slate-800 whitespace-nowrap">数据分析</h2>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Segmented
            options={[
              { label: '用户访问', value: 'visit' },
              { label: '用户画像', value: 'profile' },
            ]}
            value={activeTab}
            onChange={(value) => setActiveTab(value as 'visit' | 'profile')}
          />
          <RangePicker
            locale={locale}
            presets={rangePresets}
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]] as [Dayjs, Dayjs]);
              }
            }}
            className="w-full md:w-64"
          />
        </div>

        {activeTab === 'visit' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatisticCard
                title="活跃用户数"
                value={summaryData?.activeUsers.value ?? 0}
                change={summaryData?.activeUsers.change ?? null}
                loading={loading}
              />
              <StatisticCard
                title="注册用户数"
                value={summaryData?.registeredUsers.value ?? 0}
                change={summaryData?.registeredUsers.change ?? null}
                loading={loading}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PvUvChart data={visitData} loading={loading} />
              <UserGrowthChart data={userGrowthData} loading={loading} />
              <CumulativeUsersChart data={cumulativeUsersData} loading={loading} />
              <TopPagesChart data={topPagesData} loading={loading} />
            </div>
          </div>
        )}
        
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UserAgentChart data={browserData} loading={loading} />
            <OsChart data={osData} loading={loading} />
            <DeviceChart data={deviceData} loading={loading} />
            <ActiveHoursChart data={activeHoursData} loading={loading} />
          </div>
        )}
      </div>
    </div>
  );
}
