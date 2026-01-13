import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import ReactECharts from 'echarts-for-react';
import { analyticsApi, type VisitData } from '@/api/analytics';
import type { Dayjs } from 'dayjs';

interface PvUvChartProps {
  dateRange: [Dayjs, Dayjs];
}

export function PvUvChart({ dateRange }: PvUvChartProps) {
  const [data, setData] = useState<VisitData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [start, end] = dateRange;
      const res = await analyticsApi.getStats(
        start.format('YYYY-MM-DD'),
        end.format('YYYY-MM-DD')
      );
      // Ensure data is valid
      if (res && res.visit) {
         setData(res.visit);
      } else {
         setData([]);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Transform data for ECharts
  const getOption = () => {
    // Extract unique dates for x-axis
    const dates = Array.from(new Set(data.map(item => item.date)));
    
    // Extract series data
    const pvData = dates.map(date => {
      const item = data.find(d => d.date === date && d.type === 'PV');
      return item ? item.value : 0;
    });
    
    const uvData = dates.map(date => {
      const item = data.find(d => d.date === date && d.type === 'UV');
      return item ? item.value : 0;
    });

    return {
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['PV', 'UV'],
        top: 0,
        left: 'center'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates
      },
      yAxis: {
        type: 'value'
      },
      color: ['#1979C9', '#D62A0D'],
      series: [
        {
          name: 'PV',
          type: 'line',
          smooth: true,
          data: pvData,
          symbol: 'diamond',
          symbolSize: 8
        },
        {
          name: 'UV',
          type: 'line',
          smooth: true,
          data: uvData,
          symbol: 'diamond',
          symbolSize: 8
        }
      ]
    };
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium text-slate-900 mb-4">访问趋势 (PV/UV)</h3>
      <div className="h-[300px]">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ReactECharts option={getOption()} style={{ height: '100%', width: '100%' }} />
        )}
      </div>
    </Card>
  );
}
