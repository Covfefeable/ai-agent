import { Card } from '@/components/ui/card';
import ReactECharts from 'echarts-for-react';
import { type VisitData } from '@/api/analytics';

interface PvUvChartProps {
  data: VisitData[];
  loading?: boolean;
}

export function PvUvChart({ data, loading = false }: PvUvChartProps) {
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
      title: {
        text: '访问趋势',
        left: 'left',
        textStyle: {
            fontSize: 16,
            fontWeight: 'bold'
        }
      },
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
    <Card className="p-4 h-[400px]">
      <ReactECharts 
        option={getOption()} 
        style={{ height: '100%', width: '100%' }}
        showLoading={loading}
      />
    </Card>
  );
}
