import { Card, Title, Text, Group, Box, Paper, SimpleGrid } from '@mantine/core';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { useGame } from '../context/GameContext';
import { calculateHitRate, getDeviationDistribution } from '../utils/physics';

export default function StatsCharts() {
  const { state } = useGame();
  const { results, mode, bestAngleRange } = state;

  const hitRateData = results.map((result, index) => {
    const recentResults = results.slice(0, index + 1);
    const hitRate = calculateHitRate(recentResults);
    return {
      name: `第${index + 1}次`,
      命中率: Number((hitRate * 100).toFixed(1)),
      命中: result.hit ? 1 : 0,
    };
  });

  const deviationData = getDeviationDistribution(results, 8);

  const forceTrendData = results.map((result, index) => ({
    name: `第${index + 1}次`,
    力度: Number(result.params.launchForce.toFixed(1)),
    命中: result.hit ? 1 : 0,
    偏差: Number(result.deviationDistance.toFixed(2)),
  }));

  const hasData = results.length > 0;

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Title order={3} mb="md">统计分析</Title>

      {!hasData ? (
        <Box
          style={{
            height: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--mantine-color-gray-0)',
            borderRadius: '8px',
          }}
        >
          <Text c="dimmed">暂无数据，请开始投掷</Text>
        </Box>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          <Box>
            <Group justify="space-between" mb="xs">
              <Text fw={500} size="sm">命中率趋势</Text>
              <Text size="xs" c="dimmed">
                {(calculateHitRate(results) * 100).toFixed(1)}%
              </Text>
            </Group>
            <Box h={200}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hitRateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    interval={Math.floor(hitRateData.length / 4)}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10 }}
                    label={{ value: '%', angle: -90, position: 'insideLeft', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: '8px' }}
                    formatter={(value) => [`${value}%`, '命中率']}
                  />
                  <ReferenceLine y={50} stroke="#ffd43b" strokeDasharray="5 5" />
                  <Line
                    type="monotone"
                    dataKey="命中率"
                    stroke="#228be6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Box>

          <Box>
            <Text fw={500} size="sm" mb="xs">偏差距离分布</Text>
            <Box h={200}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deviationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 8 }}
                    label={{ value: '偏差(m)', position: 'insideBottom', offset: -5, fontSize: 9 }}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    label={{ value: '次数', angle: -90, position: 'insideLeft', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: '8px' }}
                    formatter={(value) => [value, '次数']}
                  />
                  <Bar
                    dataKey="count"
                    fill="#40c057"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Box>

          <Box>
            <Text fw={500} size="sm" mb="xs">力度变化趋势</Text>
            <Box h={200}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    interval={Math.floor(forceTrendData.length / 4)}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10 }}
                    domain={[0, 'auto']}
                    label={{ value: '力度', angle: -90, position: 'insideLeft', fontSize: 10 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10 }}
                    domain={[0, 'auto']}
                    label={{ value: '偏差(m)', angle: 90, position: 'insideRight', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="偏差"
                    fill="#ffe066"
                    stroke="#fcc419"
                    fillOpacity={0.3}
                    strokeWidth={1}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="力度"
                    stroke="#f59f00"
                    strokeWidth={2}
                    dot={(props: Record<string, unknown>) => {
                      const { cx, cy, payload } = props as { cx: number; cy: number; payload: { 命中: number } };
                      return (
                        <circle
                          key={`dot-${cx}-${cy}`}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={payload.命中 ? '#40c057' : '#fa5252'}
                          stroke="#fff"
                          strokeWidth={1}
                        />
                      );
                    }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </SimpleGrid>
      )}

      {mode === 'free' && bestAngleRange && hasData && (
        <Paper p="sm" bg="blue.0" radius="md" withBorder={false} mt="md">
          <Group justify="space-between">
            <Text size="sm" fw={500}>最佳命中角度区间</Text>
            <Text size="sm" fw={700} c="blue">
              {bestAngleRange.min.toFixed(0)}° - {bestAngleRange.max.toFixed(0)}°
            </Text>
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            基于 {results.filter((r) => r.hit).length} 次命中记录计算
          </Text>
        </Paper>
      )}
    </Card>
  );
}
