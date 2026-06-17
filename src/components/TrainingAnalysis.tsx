import { Card, Title, Text, Group, Box, Paper, SimpleGrid, Badge, RingProgress, Stack } from '@mantine/core';
import {
  Line,
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
  AreaChart,
} from 'recharts';
import { IconArrowUp, IconArrowDown, IconCheck, IconClock, IconTarget, IconTrophy } from '@tabler/icons-react';
import type { TrainingAnalysisData } from '../types/game';

interface Props {
  analysis: TrainingAnalysisData;
  onClose?: () => void;
}

export default function TrainingAnalysis({ analysis, onClose }: Props) {
  const { hitRateTrend, deviationConvergence, forceStability, angleConvergence, summary } = analysis;

  const StatCard = ({
    label,
    value,
    change,
    positive,
    icon,
  }: {
    label: string;
    value: string;
    change?: number;
    positive: boolean;
    icon: React.ReactNode;
  }) => (
    <Paper p="sm" bg="gray.0" radius="md" withBorder>
      <Group justify="space-between" align="flex-start" mb="xs">
        <Group gap="xs">
          {icon}
          <Text size="xs" c="dimmed">{label}</Text>
        </Group>
        {change !== undefined && (
          <Badge
            color={positive ? 'green' : 'red'}
            variant="light"
            size="xs"
            leftSection={
              change >= 0 ? (
                <IconArrowUp size={10} />
              ) : (
                <IconArrowDown size={10} />
              )
            }
          >
            {Math.abs(change)}%
          </Badge>
        )}
      </Group>
      <Text size="xl" fw={700}>{value}</Text>
    </Paper>
  );

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" align="center" mb="md">
        <Group>
          <Title order={3}>训练成果分析报告</Title>
          <Badge color={summary.hitRateImprovement >= 0 ? 'green' : 'red'} variant="filled" size="lg">
            {summary.hitRateImprovement >= 0 ? '进步显著' : '需要更多练习'}
          </Badge>
        </Group>
        <Group gap="md">
          <RingProgress
            size={60}
            thickness={6}
            roundCaps
            sections={[
              {
                value: summary.inTrainingHitRate,
                color: summary.inTrainingHitRate > 50 ? 'green' : summary.inTrainingHitRate > 25 ? 'yellow' : 'red',
              },
            ]}
            label={
              <Text size="xs" fw={700} ta="center">
                {summary.inTrainingHitRate}%
              </Text>
            }
          />
          <Box>
            <Group gap="xs" mb={2}>
              <IconTrophy size={14} color={summary.totalHits > 0 ? '#fcc419' : '#adb5bd'} />
              <Text size="sm" fw={600}>
                {summary.totalHits}/{summary.totalAttempts} 命中
              </Text>
            </Group>
            <Group gap="xs">
              <IconCheck size={14} color={summary.levelsCompleted > 0 ? '#40c057' : '#adb5bd'} />
              <Text size="xs" c="dimmed">
                完成 {summary.levelsCompleted}/{summary.totalLevels} 关卡
              </Text>
            </Group>
            <Group gap="xs">
              <IconClock size={14} color="#228be6" />
              <Text size="xs" c="dimmed">
                用时 {Math.floor(summary.trainingDuration / 60)}分{summary.trainingDuration % 60}秒
              </Text>
            </Group>
          </Box>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="sm" mb="md">
        <StatCard
          label="训练命中率"
          value={`${summary.inTrainingHitRate}%`}
          change={summary.hitRateImprovement}
          positive={summary.hitRateImprovement >= 0}
          icon={<IconTarget size={16} color="#228be6" />}
        />
        <StatCard
          label="平均偏差"
          value={`${summary.avgDeviationAfter}m`}
          change={typeof summary.deviationImprovement === 'number' ? summary.deviationImprovement : 0}
          positive={(summary.deviationImprovement ?? 0) >= 0}
          icon={<IconArrowDown size={16} color="#f59f00" />}
        />
        <StatCard
          label="力度稳定性"
          value={`σ=${summary.forceStdAfter}`}
          change={summary.forceStabilityImprovement}
          positive={summary.forceStabilityImprovement >= 0}
          icon={<IconTarget size={16} color="#845ef7" />}
        />
        <StatCard
          label="角度收敛度"
          value={
            summary.finalAngleRange
              ? `${summary.finalAngleRange.min.toFixed(0)}°-${summary.finalAngleRange.max.toFixed(0)}°`
              : '未形成'
          }
          change={summary.angleRangeNarrowing > 0 ? summary.angleRangeNarrowing : undefined}
          positive={summary.angleRangeNarrowing > 0}
          icon={<IconCheck size={16} color="#40c057" />}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md">
        <Paper p="sm" bg="gray.0" radius="md" withBorder>
          <Stack gap="sm">
            <Text size="sm" fw={600}>训练前后对比</Text>
            <Group justify="space-between">
              <Box>
                <Text size="xs" c="dimmed" mb={2}>训练前命中率</Text>
                <Text size="lg" fw={700}>{summary.preTrainingHitRate}%</Text>
              </Box>
              <Badge
                color={summary.hitRateImprovement >= 0 ? 'green' : 'red'}
                size="lg"
                variant="outline"
              >
                {summary.hitRateImprovement >= 0 ? '+' : ''}{summary.hitRateImprovement}%
              </Badge>
              <Box style={{ textAlign: 'right' }}>
                <Text size="xs" c="dimmed" mb={2}>训练中命中率</Text>
                <Text size="lg" fw={700} c={summary.inTrainingHitRate > summary.preTrainingHitRate ? 'green' : 'red'}>
                  {summary.inTrainingHitRate}%
                </Text>
              </Box>
            </Group>
            <Group justify="space-between">
              <Box>
                <Text size="xs" c="dimmed" mb={2}>训练前平均偏差</Text>
                <Text size="lg" fw={700}>{summary.avgDeviationBefore}m</Text>
              </Box>
              <Badge
                color={(summary.deviationImprovement ?? 0) >= 0 ? 'green' : 'red'}
                size="lg"
                variant="outline"
              >
                {(summary.deviationImprovement ?? 0) >= 0 ? '-' : '+'}
                {Math.abs(summary.deviationImprovement ?? 0)}%
              </Badge>
              <Box style={{ textAlign: 'right' }}>
                <Text size="xs" c="dimmed" mb={2}>训练中平均偏差</Text>
                <Text
                  size="lg"
                  fw={700}
                  c={summary.avgDeviationAfter <= summary.avgDeviationBefore ? 'green' : 'red'}
                >
                  {summary.avgDeviationAfter}m
                </Text>
              </Box>
            </Group>
            {summary.initialAngleRange && summary.finalAngleRange && (
              <Group justify="space-between">
                <Box>
                  <Text size="xs" c="dimmed" mb={2}>初始角度区间</Text>
                  <Text size="sm" fw={700}>
                    {summary.initialAngleRange.min.toFixed(0)}° - {summary.initialAngleRange.max.toFixed(0)}°
                    <Text size="xs" c="dimmed" component="span" ml="xs">
                      (宽 {Math.abs(summary.initialAngleRange.max - summary.initialAngleRange.min).toFixed(0)}°)
                    </Text>
                  </Text>
                </Box>
                <Badge
                  color={summary.angleRangeNarrowing > 0 ? 'green' : 'yellow'}
                  size="lg"
                  variant="outline"
                >
                  收敛 {summary.angleRangeNarrowing}%
                </Badge>
                <Box style={{ textAlign: 'right' }}>
                  <Text size="xs" c="dimmed" mb={2}>最终角度区间</Text>
                  <Text size="sm" fw={700} c="green">
                    {summary.finalAngleRange.min.toFixed(0)}° - {summary.finalAngleRange.max.toFixed(0)}°
                    <Text size="xs" c="dimmed" component="span" ml="xs">
                      (宽 {Math.abs(summary.finalAngleRange.max - summary.finalAngleRange.min).toFixed(0)}°)
                    </Text>
                  </Text>
                </Box>
              </Group>
            )}
          </Stack>
        </Paper>

        <Box>
          <Group justify="space-between" mb="xs">
            <Text fw={600} size="sm">命中率变化趋势 (训练前 vs 训练中)</Text>
          </Group>
          <Box h={200}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hitRateTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                  label={{ value: '%', angle: -90, position: 'insideLeft', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: '8px' }}
                  formatter={(value, name) => [`${value}%`, name as string]}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <ReferenceLine y={50} stroke="#ffd43b" strokeDasharray="5 5" label={{ value: '合格线', fontSize: 9, position: 'right' }} />
                <Bar dataKey="训练前" fill="#adb5bd" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Bar dataKey="训练中" fill="#228be6" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="训练中"
                  stroke="#fa5252"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#fa5252' }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Box>
          <Group justify="space-between" mb="xs">
            <Text fw={600} size="sm">偏差收敛趋势</Text>
            <Text size="xs" c="dimmed">线越低越精准，移动平均线显示整体趋势</Text>
          </Group>
          <Box h={220}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={deviationConvergence}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis
                  tick={{ fontSize: 10 }}
                  label={{ value: '偏差(m)', angle: -90, position: 'insideLeft', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: '8px' }}
                  formatter={(value) => [`${value}m`]}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area
                  type="monotone"
                  dataKey="偏差"
                  stroke="#868e96"
                  fill="#dee2e6"
                  fillOpacity={0.5}
                  strokeWidth={1}
                  dot={(props: Record<string, unknown>) => {
                    const { cx, cy, payload } = props as { cx: number; cy: number; payload: { 偏差: number; 移动平均: number } };
                    const isLow = payload.偏差 <= payload.移动平均;
                    return (
                      <circle
                        key={`dev-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={isLow ? '#40c057' : '#fa5252'}
                        stroke="#fff"
                        strokeWidth={1}
                      />
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="移动平均"
                  stroke="#f59f00"
                  strokeWidth={3}
                  dot={false}
                  strokeDasharray="6 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        <Box>
          <Group justify="space-between" mb="xs">
            <Text fw={600} size="sm">力度稳定性分析</Text>
            <Text size="xs" c="dimmed">绿点命中，红点未命中</Text>
          </Group>
          <Box h={220}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forceStability}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis
                  tick={{ fontSize: 10 }}
                  label={{ value: '力度', angle: -90, position: 'insideLeft', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: '8px' }}
                  formatter={(value, name) =>
                    name === '命中' ? [value ? '命中' : '未命中', name as string] : [value, name as string]
                  }
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area
                  type="monotone"
                  dataKey="平均力度"
                  stroke="#845ef7"
                  fill="#e5dbff"
                  fillOpacity={0.4}
                  strokeWidth={1}
                />
                <Line
                  type="monotone"
                  dataKey="平均力度"
                  stroke="#845ef7"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="力度"
                  stroke="#228be6"
                  strokeWidth={2}
                  dot={(props: Record<string, unknown>) => {
                    const { cx, cy, payload } = props as { cx: number; cy: number; payload: { 命中: number } };
                    return (
                      <circle
                        key={`force-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill={payload.命中 ? '#40c057' : '#fa5252'}
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                  activeDot={{ r: 7 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </SimpleGrid>

      <Box mt="md">
        <Group justify="space-between" mb="xs">
          <Text fw={600} size="sm">最佳角度收敛区间</Text>
          <Text size="xs" c="dimmed">阴影区域为命中角度区间，圆点为每次投掷角度</Text>
        </Group>
        <Box h={240}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={angleConvergence}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis
                domain={['dataMin - 5', 'dataMax + 5']}
                tick={{ fontSize: 10 }}
                label={{ value: '角度(°)', angle: -90, position: 'insideLeft', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: '8px' }}
                formatter={(value, name) => [`${value}°`, name as string]}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="上限"
                stroke="none"
                fill="#c3fae8"
                fillOpacity={0.5}
              />
              <Area
                type="monotone"
                dataKey="下限"
                stroke="none"
                fill="#ffffff"
                fillOpacity={1}
              />
              <Line
                type="monotone"
                dataKey="上限"
                stroke="#12b886"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="下限"
                stroke="#12b886"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="命中区间"
                stroke="#12b886"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="角度"
                stroke="#228be6"
                strokeWidth={1.5}
                strokeOpacity={0.4}
                dot={(props: Record<string, unknown>) => {
                  const { cx, cy, payload } = props as { cx: number; cy: number; payload: { 命中: number } };
                  return (
                    <circle
                      key={`angle-${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={payload.命中 ? '#40c057' : '#fa5252'}
                      stroke="#fff"
                      strokeWidth={1.5}
                    />
                  );
                }}
                activeDot={{ r: 7 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {summary.hitRateImprovement >= 0 ? (
        <Paper p="sm" mt="md" bg="green.0" radius="md" withBorder={false}>
          <Group>
            <IconCheck size={18} color="#40c057" />
            <Text size="sm" fw={500}>
              训练有效！你的命中率提高了 {Math.abs(summary.hitRateImprovement)}%，继续保持！
              {summary.angleRangeNarrowing > 10 && (
                <Text size="sm" component="span" ml="xs">
                  角度控制能力提升明显，最佳角度区间收敛了 {summary.angleRangeNarrowing}%。
                </Text>
              )}
            </Text>
          </Group>
        </Paper>
      ) : (
        <Paper p="sm" mt="md" bg="yellow.0" radius="md" withBorder={false}>
          <Group>
            <IconTarget size={18} color="#f59f00" />
            <Text size="sm" fw={500}>
              建议继续练习，尝试在当前最佳角度区间 {summary.finalAngleRange
                ? `${summary.finalAngleRange.min.toFixed(0)}°-${summary.finalAngleRange.max.toFixed(0)}°`
                : '附近'} 微调，控制力度在更小范围内。
            </Text>
          </Group>
        </Paper>
      )}

      {onClose && (
        <Group justify="flex-end" mt="md">
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              background: '#fff',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            返回主界面
          </button>
        </Group>
      )}
    </Card>
  );
}
