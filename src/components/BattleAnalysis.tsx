import {
  Card,
  Title,
  Text,
  Group,
  Box,
  Paper,
  SimpleGrid,
  Badge,
  Stack,
  RingProgress,
  Button,
} from '@mantine/core';
import {
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts';
import { IconTrophy, IconCheck, IconClock, IconFlame, IconTarget, IconSwords } from '@tabler/icons-react';
import type { BattleAnalysisData } from '../types/game';

interface Props {
  analysis: BattleAnalysisData;
  onClose?: () => void;
  onPlayAgain?: () => void;
}

export default function BattleAnalysis({ analysis, onClose, onPlayAgain }: Props) {
  const { hitRateComparison, deviationComparison, forceStability, keyRounds, summary } = analysis;
  const p1Color = '#228be6';
  const p2Color = '#be4bdb';

  const winnerLabel = summary.winner === 1
    ? summary.player1Name
    : summary.winner === 2
    ? summary.player2Name
    : '平局';

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" align="center" mb="md">
        <Group>
          <Title order={3}>⚔️ 对战结果分析</Title>
          <Badge
            color={summary.winner === 0 ? 'yellow' : 'orange'}
            variant="filled"
            size="lg"
          >
            {summary.winner === 0 ? '平局' : `${winnerLabel} 获胜`}
          </Badge>
        </Group>
        <Group gap="md">
          <RingProgress
            size={60}
            thickness={6}
            roundCaps
            sections={[
              {
                value: Math.min(summary.player1HitRate, 100),
                color: 'blue',
              },
            ]}
            label={<Text size="xs" fw={700} ta="center">{summary.player1HitRate}%</Text>}
          />
          <RingProgress
            size={60}
            thickness={6}
            roundCaps
            sections={[
              {
                value: Math.min(summary.player2HitRate, 100),
                color: 'grape',
              },
            ]}
            label={<Text size="xs" fw={700} ta="center">{summary.player2HitRate}%</Text>}
          />
          <Box>
            <Group gap="xs" mb={2}>
              <IconTrophy size={14} color={summary.winner === 1 ? '#fcc419' : '#adb5bd'} />
              <Text size="sm" fw={600}>
                {summary.player1Name}: {summary.player1TotalScore} 分
              </Text>
            </Group>
            <Group gap="xs">
              <IconTrophy size={14} color={summary.winner === 2 ? '#fcc419' : '#adb5bd'} />
              <Text size="sm" fw={600}>
                {summary.player2Name}: {summary.player2TotalScore} 分
              </Text>
            </Group>
            <Group gap="xs">
              <IconClock size={14} color="#228be6" />
              <Text size="xs" c="dimmed">
                用时 {Math.floor(summary.duration / 60)}分{summary.duration % 60}秒
              </Text>
            </Group>
          </Box>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="sm" mb="md">
        <StatCard
          label={`${summary.player1Name} 命中率`}
          value={`${summary.player1HitRate}%`}
          icon={<IconTarget size={16} color={p1Color} />}
          color="blue"
        />
        <StatCard
          label={`${summary.player2Name} 命中率`}
          value={`${summary.player2HitRate}%`}
          icon={<IconTarget size={16} color={p2Color} />}
          color="grape"
        />
        <StatCard
          label={`${summary.player1Name} 最大连中`}
          value={`${summary.player1MaxStreak}`}
          icon={<IconFlame size={16} color="#fd7e14" />}
          color="orange"
        />
        <StatCard
          label={`${summary.player2Name} 最大连中`}
          value={`${summary.player2MaxStreak}`}
          icon={<IconFlame size={16} color="#fd7e14" />}
          color="orange"
        />
      </SimpleGrid>

      <Paper p="sm" bg="gray.0" radius="md" withBorder mb="md">
        <Stack gap="sm">
          <Text size="sm" fw={600}>双方数据对比</Text>
          <Group justify="space-between">
            <Box>
              <Text size="xs" c="dimmed" mb={2}>平均偏差</Text>
              <Group gap="xs">
                <Text size="sm" fw={700} c={summary.player1AvgDeviation <= summary.player2AvgDeviation ? 'green' : 'red'}>
                  {summary.player1Name}: {summary.player1AvgDeviation}m
                </Text>
                <Text size="sm" fw={700} c={summary.player2AvgDeviation <= summary.player1AvgDeviation ? 'green' : 'red'}>
                  {summary.player2Name}: {summary.player2AvgDeviation}m
                </Text>
              </Group>
            </Box>
          </Group>
          <Group justify="space-between">
            <Box>
              <Text size="xs" c="dimmed" mb={2}>力度稳定性 (σ)</Text>
              <Group gap="xs">
                <Text size="sm" fw={700} c={summary.player1ForceStd <= summary.player2ForceStd ? 'green' : 'red'}>
                  {summary.player1Name}: {summary.player1ForceStd}
                </Text>
                <Text size="sm" fw={700} c={summary.player2ForceStd <= summary.player1ForceStd ? 'green' : 'red'}>
                  {summary.player2Name}: {summary.player2ForceStd}
                </Text>
              </Group>
            </Box>
          </Group>
        </Stack>
      </Paper>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md">
        <Box>
          <Text fw={600} size="sm" mb="xs">命中率曲线对比</Text>
          <Box h={220}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hitRateComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis dataKey="round" tick={{ fontSize: 9 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} label={{ value: '%', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: '8px' }} formatter={(value) => [`${value}%`]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="player1" stroke={p1Color} strokeWidth={2} name={summary.player1Name} dot={{ r: 3, fill: p1Color }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="player2" stroke={p2Color} strokeWidth={2} name={summary.player2Name} dot={{ r: 3, fill: p2Color }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        <Box>
          <Text fw={600} size="sm" mb="xs">偏差对比</Text>
          <Box h={220}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={deviationComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis dataKey="round" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} label={{ value: 'm', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="player1" stroke={p1Color} fill={p1Color} fillOpacity={0.2} strokeWidth={1.5} name={`${summary.player1Name} 偏差`} />
                <Area type="monotone" dataKey="player2" stroke={p2Color} fill={p2Color} fillOpacity={0.2} strokeWidth={1.5} name={`${summary.player2Name} 偏差`} />
                <Line type="monotone" dataKey="player1Avg" stroke={p1Color} strokeWidth={2} strokeDasharray="4 4" dot={false} name={`${summary.player1Name} 均值`} />
                <Line type="monotone" dataKey="player2Avg" stroke={p2Color} strokeWidth={2} strokeDasharray="4 4" dot={false} name={`${summary.player2Name} 均值`} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md">
        <Box>
          <Text fw={600} size="sm" mb="xs">力度稳定性对比</Text>
          <Box h={220}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forceStability}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis dataKey="round" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} label={{ value: '力度', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="player1Force" stroke={p1Color} strokeWidth={2}
                  dot={(props: Record<string, unknown>) => {
                    const { cx, cy, payload } = props as { cx: number; cy: number; payload: { player1Hit: number } };
                    return <circle key={`p1f-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={payload.player1Hit ? '#40c057' : p1Color} stroke="#fff" strokeWidth={1} />;
                  }}
                  name={summary.player1Name}
                />
                <Line type="monotone" dataKey="player2Force" stroke={p2Color} strokeWidth={2}
                  dot={(props: Record<string, unknown>) => {
                    const { cx, cy, payload } = props as { cx: number; cy: number; payload: { player2Hit: number } };
                    return <circle key={`p2f-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={payload.player2Hit ? '#40c057' : p2Color} stroke="#fff" strokeWidth={1} />;
                  }}
                  name={summary.player2Name}
                />
                <Line type="monotone" dataKey="player1Avg" stroke={p1Color} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name={`${summary.player1Name} 均值`} />
                <Line type="monotone" dataKey="player2Avg" stroke={p2Color} strokeWidth={1.5} strokeDasharray="4 4" dot={false} name={`${summary.player2Name} 均值`} />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        <Box>
          <Text fw={600} size="sm" mb="xs">关键回合表现</Text>
          <Box h={220}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={keyRounds}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis dataKey="round" tick={{ fontSize: 10 }} label={{ value: '回合', position: 'insideBottom', offset: -5, fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} label={{ value: '分差', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <ReferenceLine y={0} stroke="#868e96" />
                <Bar dataKey="player1Score" fill={p1Color} radius={[4, 4, 0, 0]} name={`${summary.player1Name} 得分`} />
                <Bar dataKey="player2Score" fill={p2Color} radius={[4, 4, 0, 0]} name={`${summary.player2Name} 得分`} />
                <Line type="monotone" dataKey="swing" stroke="#fd7e14" strokeWidth={2} dot={{ r: 3, fill: '#fd7e14' }} name="分差波动" />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </SimpleGrid>

      {summary.winner !== 0 && (
        <Paper p="sm" mt="md" bg="orange.0" radius="md" withBorder={false}>
          <Group>
            <IconTrophy size={18} color="#fd7e14" />
            <Text size="sm" fw={500}>
              恭喜 {winnerLabel} 赢得对战！
              {summary.winner === 1 && summary.player1MaxStreak >= 3 && (
                <Text size="sm" component="span" ml="xs">
                  连中 ×{summary.player1MaxStreak} 是制胜关键！
                </Text>
              )}
              {summary.winner === 2 && summary.player2MaxStreak >= 3 && (
                <Text size="sm" component="span" ml="xs">
                  连中 ×{summary.player2MaxStreak} 是制胜关键！
                </Text>
              )}
            </Text>
          </Group>
        </Paper>
      )}

      {summary.winner === 0 && (
        <Paper p="sm" mt="md" bg="yellow.0" radius="md" withBorder={false}>
          <Group>
            <IconCheck size={18} color="#fcc419" />
            <Text size="sm" fw={500}>
              势均力敌！双方以 {summary.player1TotalScore} 分打成平局！
            </Text>
          </Group>
        </Paper>
      )}

      {(onClose || onPlayAgain) && (
        <Group justify="flex-end" mt="md">
          {onPlayAgain && (
            <Button
              color="orange"
              leftSection={<IconSwords size={16} />}
              onClick={onPlayAgain}
            >
              再来一局
            </Button>
          )}
          {onClose && (
            <Button
              variant="outline"
              color="gray"
              onClick={onClose}
            >
              返回主界面
            </Button>
          )}
        </Group>
      )}
    </Card>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Paper p="sm" bg="gray.0" radius="md" withBorder>
      <Group gap="xs" mb="xs">
        {icon}
        <Text size="xs" c="dimmed">{label}</Text>
      </Group>
      <Text size="xl" fw={700} c={color}>{value}</Text>
    </Paper>
  );
}
