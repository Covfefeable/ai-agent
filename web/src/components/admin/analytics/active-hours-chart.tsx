import { Card } from '@/components/ui/card';
import ReactECharts from 'echarts-for-react';
import type { ActiveHoursData } from '@/api/analytics';

interface ActiveHoursChartProps {
  data: ActiveHoursData[];
  loading?: boolean;
}

export function ActiveHoursChart({ data, loading = false }: ActiveHoursChartProps) {
  const getOption = () => {
    return {
      title: {
        text: '活跃时段分布',
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
        },
        formatter: '{b}: {c} 次访问'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.map(item => item.hour),
        axisTick: {
          alignWithLabel: true
        }
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '访问次数',
          type: 'bar',
          barWidth: '60%',
          data: data.map(item => item.value),
          itemStyle: {
            color: '#8b5cf6', // Violet
            borderRadius: [4, 4, 0, 0]
          }
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
        loadingOption={{
          text: '加载中...',
          color: '#3b82f6',
          textColor: '#3b82f6',
          maskColor: 'rgba(255, 255, 255, 0.8)',
          zlevel: 0,
        }}
      />
    </Card>
  );
}
