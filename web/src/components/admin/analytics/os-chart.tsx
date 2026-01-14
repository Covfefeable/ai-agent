import { Card } from '@/components/ui/card';
import ReactECharts from 'echarts-for-react';
import type { OsData } from '@/api/analytics';

interface OsChartProps {
  data: OsData[];
  loading?: boolean;
}

export function OsChart({ data, loading = false }: OsChartProps) {
  const getOption = () => {
    return {
      title: {
        text: '用户操作系统分布',
        left: 'left',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center'
      },
      color: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'],
      series: [
        {
          name: '操作系统',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 20,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: data
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
        notMerge={true}
      />
    </Card>
  );
}