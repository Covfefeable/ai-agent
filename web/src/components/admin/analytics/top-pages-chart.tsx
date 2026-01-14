import { Card } from '@/components/ui/card';
import ReactECharts from 'echarts-for-react';
import type { TopPageData } from '@/api/analytics';

interface TopPagesChartProps {
  data: TopPageData[];
  loading?: boolean;
}

export function TopPagesChart({ data, loading = false }: TopPagesChartProps) {
  const getOption = () => {
    // Reverse data to show top items at the top of the chart (since Y-axis category goes bottom-up)
    const sortedData = [...data].reverse();
    
    const urls = sortedData.map(item => {
        try {
            // Try to extract path from URL
            const urlObj = new URL(item.url);
            return urlObj.pathname + urlObj.search;
        } catch {
            // Fallback to full URL or whatever string is there
            return item.url;
        }
    });

    return {
      title: {
        text: '访问页面 TOP 10',
        left: 'left',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
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
        type: 'value',
        boundaryGap: [0, 0.01]
      },
      yAxis: {
        type: 'category',
        data: urls,
        axisLabel: {
          width: 200,
          overflow: 'truncate', // Truncate long URLs
          interval: 0
        }
      },
      series: [
        {
          name: 'PV',
          type: 'bar',
          data: sortedData.map(item => item.pv),
          label: {
            show: true,
            position: 'right'
          },
          itemStyle: {
            color: '#6366f1',
            borderRadius: [0, 4, 4, 0]
          }
        },
        {
          name: 'UV',
          type: 'bar',
          data: sortedData.map(item => item.uv),
          label: {
            show: true,
            position: 'right'
          },
          itemStyle: {
            color: '#10b981',
            borderRadius: [0, 4, 4, 0]
          }
        }
      ]
    };
  };

  const onEvents = {
    click: (params: { componentType: string; dataIndex: number }) => {
      if (params.componentType === 'series') {
        const sortedData = [...data].reverse();
        const item = sortedData[params.dataIndex];
        if (item?.url) {
          window.open(item.url, '_blank');
        }
      }
    },
  };

  return (
    <Card className="p-4 h-[400px]">
      <ReactECharts 
        option={getOption()} 
        style={{ height: '100%', width: '100%' }}
        showLoading={loading}
        onEvents={onEvents}
        notMerge={true}
      />
    </Card>
  );
}
