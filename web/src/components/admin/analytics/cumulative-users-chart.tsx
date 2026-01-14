import { Card } from '@/components/ui/card';
import ReactECharts from 'echarts-for-react';
import { type CumulativeUserData } from '@/api/analytics';

interface CumulativeUsersChartProps {
  data: CumulativeUserData[];
  loading?: boolean;
}

export function CumulativeUsersChart({ data, loading = false }: CumulativeUsersChartProps) {
  // Transform data for ECharts
  const getOption = () => {
    // Extract unique dates for x-axis
    const dates = Array.from(new Set(data.map(item => item.date)));
    
    // Extract series data
    const totalData = dates.map(date => {
      const item = data.find(d => d.date === date);
      return item ? item.value : 0;
    });

    return {
      title: {
        text: '累计用户数',
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
        data: ['Total Users'],
        top: 0,
        left: 'center',
        show: false
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
      color: ['#f59e0b'],
      series: [
        {
          name: '累计用户',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: totalData,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            width: 4
          },
          areaStyle: {
            opacity: 0.1,
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                  offset: 0, color: '#f59e0b' // 0% 处的颜色
              }, {
                  offset: 1, color: 'rgba(245, 158, 11, 0.1)' // 100% 处的颜色
              }]
            }
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
        notMerge={true}
      />
    </Card>
  );
}
