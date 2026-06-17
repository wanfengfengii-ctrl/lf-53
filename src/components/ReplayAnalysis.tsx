import { useState, useMemo } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Box,
  Paper,
  Stack,
  Badge,
  Tabs,
  SimpleGrid,
  Slider,
  Switch,
  SegmentedControl,
  ScrollArea,
  RingProgress,
} from '@mantine/core';
import {
  IconFlame,
  IconArrowUpRight,
  IconTarget,
  IconChartBar,
  IconFilter,
  IconTrophy,
  IconTrendingUp,
  IconTrendingDown,
  IconExchange,
} from '@tabler/icons-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { useGame } from '../context/GameContext';
import { filterReplayRounds } from '../utils/physics';
import type { TurningPoint } from '../types/game';

export default function ReplayAnalysis() {
  const { state, setReplayFilter, setReplayRound } = useGame();
  const { replay } = state;
  const { currentSession, analysis, filter } = replay;

  const [activeTab, setActiveTab] = useState<string | null>('overview');

  if (!currentSession || !analysis) return null;

  const p1Color = '#228be6';
  const p2Color = '#be4bdb';
  const p1Name = currentSession.config.player1Name;
  const p2Name = currentSession.config.player2Name;

  const filteredRounds = useMemo(() => {
    return filterReplayRounds(currentSession, filter);
  }, [currentSession, filter]);

  const handleTurningPointClick = (round: number) => {
    const roundIndex = currentSession.rounds.findIndex((r) => r.round === round);
    if (roundIndex >= 0) {
      setReplayRound(roundIndex);
    }
  };

  const getTurningPointIcon = (type: TurningPoint['type']) => {
    switch (type) {
      case 'comeback':
        return <IconTrendingUp size={16} color="#40c057" />;
      case 'collapse':
        return <IconTrendingDown size={16} color="#fa5252" />;
      case 'streak_start':
        return <IconFlame size={16} color="#fd7e14" />;
      case 'streak_end':
        return <IconFlame size={16} color="#adb5bd" />;
      case 'lead_change':
        return <IconExchange size={16} color="#228be6" />;
      default:
        return <IconTarget size={16} />;
    }
  };

  const getTurningPointColor = (type: TurningPoint['type']) => {
    switch (type) {
      case 'comeback':
        return 'green';
      case 'collapse':
        return 'red';
      case 'streak_start':
        return 'orange';
      case 'streak_end':
        return 'gray';
      case 'lead_change':
        return 'blue';
      default:
        return 'gray';
    }
  };

  return (
    <Card shadow="sm" p="md" radius="md" withBorder style={{ height: '100%' }}>
      <Stack gap="md" style={{ height: '100%' }}>
        <Group justify="space-between" align="flex-start">
          <Group>
            <Title order={3}>📊 对战分析</Title>
            <Badge color="teal" variant="light">
              共 {currentSession.rounds.length} 次投掷
            </Badge>
          </Group>
          <Group gap="xs">
            <RingProgress
              size={50}
              thickness={4}
              roundCaps
              sections={[
                {
                  value: Math.min(analysis.playerStats.player1.hitRate, 100),
                  color: 'blue',
                },
              ]}
              label={
                <Text size="xs" fw={700} ta="center" c="blue">
                  {analysis.playerStats.player1.hitRate}%
                </Text>
              }
            />
            <RingProgress
              size={50}
              thickness={4}
              roundCaps
              sections={[
                {
                  value: Math.min(analysis.playerStats.player2.hitRate, 100),
                  color: 'grape',
                },
              ]}
              label={
                <Text size="xs" fw={700} ta="center" c="grape">
                  {analysis.playerStats.player2.hitRate}%
                </Text>
              }
            />
          </Group>
        </Group>

        <Tabs value={activeTab} onChange={setActiveTab} style={{ flex: 1, minHeight: 0 }}>
          <Tabs.List grow>
            <Tabs.Tab value="overview" leftSection={<IconChartBar size={14} />}>
              总览
            </Tabs.Tab>
            <Tabs.Tab value="turning" leftSection={<IconArrowUpRight size={14} />}>
              转折点
            </Tabs.Tab>
            <Tabs.Tab value="filter" leftSection={<IconFilter size={14} />}>
              筛选对比
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="md" style={{ height: 'calc(100% - 36px)', overflow: 'auto' }}>
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <StatCard
                  label={`${p1Name} 得分`}
                  value={`${currentSession.player1Score} 分`}
                  icon={<IconTrophy size={16} color={p1Color} />}
                  color="blue"
                  highlight={currentSession.winner === 1}
                />
                <StatCard
                  label={`${p2Name} 得分`}
                  value={`${currentSession.player2Score} 分`}
                  icon={<IconTrophy size={16} color={p2Color} />}
                  color="grape"
                  highlight={currentSession.winner === 2}
                />
              </SimpleGrid>

              <Box>
                <Text fw={600} size="sm" mb="xs">
                  比分走势
                </Text>
                <Box h={180}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analysis.scoreTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                      <XAxis dataKey="round" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Area
                        type="monotone"
                        dataKey="player1Score"
                        stroke={p1Color}
                        fill={p1Color}
                        fillOpacity={0.15}
                        strokeWidth={2}
                        name={p1Name}
                      />
                      <Area
                        type="monotone"
                        dataKey="player2Score"
                        stroke={p2Color}
                        fill={p2Color}
                        fillOpacity={0.15}
                        strokeWidth={2}
                        name={p2Name}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Box>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <Box>
                  <Text fw={600} size="xs" mb="xs">
                    {p1Name} 数据
                  </Text>
                  <DataList stats={analysis.playerStats.player1} color="blue" />
                </Box>
                <Box>
                  <Text fw={600} size="xs" mb="xs">
                    {p2Name} 数据
                  </Text>
                  <DataList stats={analysis.playerStats.player2} color="grape" />
                </Box>
              </SimpleGrid>

              <Paper p="sm" bg="gray.0" radius="md" withBorder={false}>
                <Text size="xs" fw={600} mb="xs">
                  优势对比
                </Text>
                <Stack gap={4}>
                  <AdvantageRow
                    label="精准度"
                    advantage={analysis.comparison.accuracyAdvantage}
                    player1Name={p1Name}
                    player2Name={p2Name}
                  />
                  <AdvantageRow
                    label="稳定性"
                    advantage={analysis.comparison.stabilityAdvantage}
                    player1Name={p1Name}
                    player2Name={p2Name}
                  />
                  <AdvantageRow
                    label="投掷力度"
                    advantage={analysis.comparison.forceAdvantage}
                    player1Name={p1Name}
                    player2Name={p2Name}
                  />
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="turning" pt="md" style={{ height: 'calc(100% - 36px)' }}>
            <Stack gap="sm" style={{ height: '100%' }}>
              <Text size="sm" fw={600}>
                胜负转折点 ({analysis.turningPoints.length} 个)
              </Text>
              <ScrollArea type="hover" style={{ flex: 1, minHeight: 0 }}>
                <Stack gap="sm">
                  {analysis.turningPoints.length === 0 ? (
                    <Text c="dimmed" size="sm" ta="center" py="xl">
                      暂无明显转折点
                    </Text>
                  ) : (
                    analysis.turningPoints.map((tp, index) => (
                      <Paper
                        key={index}
                        p="sm"
                        withBorder
                        radius="md"
                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                        onClick={() => handleTurningPointClick(tp.round)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <Group justify="space-between" align="flex-start" mb="xs">
                          <Group gap="xs">
                            <Badge color={getTurningPointColor(tp.type)} variant="light" size="sm">
                              第 {tp.round} 轮
                            </Badge>
                            {getTurningPointIcon(tp.type)}
                            <Text size="sm" fw={600}>
                              {tp.description}
                            </Text>
                          </Group>
                          <Badge
                            color={tp.player === 1 ? 'blue' : 'grape'}
                            variant="filled"
                            size="xs"
                          >
                            {tp.player === 1 ? p1Name : p2Name}
                          </Badge>
                        </Group>
                        <Group gap="md">
                          <Text size="xs" c="dimmed">
                            比分变化: {tp.beforeScore.player1}:{tp.beforeScore.player2} →{' '}
                            {tp.afterScore.player1}:{tp.afterScore.player2}
                          </Text>
                          <Text size="xs" fw={500} c={tp.impactScore > 0 ? 'green' : 'red'}>
                            影响: {tp.impactScore > 0 ? '+' : ''}
                            {tp.impactScore} 分
                          </Text>
                        </Group>
                      </Paper>
                    ))
                  )}
                </Stack>
              </ScrollArea>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="filter" pt="md" style={{ height: 'calc(100% - 36px)', overflow: 'auto' }}>
            <Stack gap="md">
              <Paper p="sm" bg="gray.0" radius="md" withBorder={false}>
                <Stack gap="sm">
                  <Group gap="xs">
                    <IconFilter size={14} />
                    <Text size="sm" fw={600}>
                      筛选条件
                    </Text>
                  </Group>

                  <Group grow>
                    <Box>
                      <Text size="xs" c="dimmed" mb={4}>
                        玩家
                      </Text>
                      <SegmentedControl
                        value={filter.player || 'all'}
                        onChange={(val) => setReplayFilter({ player: val as 'all' | '1' | '2' })}
                        data={[
                          { label: '全部', value: 'all' },
                          { label: p1Name, value: '1' },
                          { label: p2Name, value: '2' },
                        ]}
                        size="xs"
                        fullWidth
                      />
                    </Box>
                  </Group>

                  <Group grow>
                    <Box>
                      <Text size="xs" c="dimmed" mb={4}>
                        最小角度: {filter.minAngle || 0}°
                      </Text>
                      <Slider
                        min={0}
                        max={90}
                        step={1}
                        value={filter.minAngle || 0}
                        onChange={(val) => setReplayFilter({ minAngle: val })}
                        size="xs"
                      />
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed" mb={4}>
                        最大角度: {filter.maxAngle || 90}°
                      </Text>
                      <Slider
                        min={0}
                        max={90}
                        step={1}
                        value={filter.maxAngle || 90}
                        onChange={(val) => setReplayFilter({ maxAngle: val })}
                        size="xs"
                      />
                    </Box>
                  </Group>

                  <Group grow>
                    <Box>
                      <Text size="xs" c="dimmed" mb={4}>
                        最小力度: {filter.minForce || 1}
                      </Text>
                      <Slider
                        min={1}
                        max={30}
                        step={0.5}
                        value={filter.minForce || 1}
                        onChange={(val) => setReplayFilter({ minForce: val })}
                        size="xs"
                      />
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed" mb={4}>
                        最大力度: {filter.maxForce || 30}
                      </Text>
                      <Slider
                        min={1}
                        max={30}
                        step={0.5}
                        value={filter.maxForce || 30}
                        onChange={(val) => setReplayFilter({ maxForce: val })}
                        size="xs"
                      />
                    </Box>
                  </Group>

                  <Group grow>
                    <Box>
                      <Text size="xs" c="dimmed" mb={4}>
                        最小偏差: {filter.minDeviation || 0}m
                      </Text>
                      <Slider
                        min={0}
                        max={5}
                        step={0.1}
                        value={filter.minDeviation || 0}
                        onChange={(val) => setReplayFilter({ minDeviation: val })}
                        size="xs"
                      />
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed" mb={4}>
                        最大偏差: {filter.maxDeviation || 5}m
                      </Text>
                      <Slider
                        min={0}
                        max={5}
                        step={0.1}
                        value={filter.maxDeviation || 5}
                        onChange={(val) => setReplayFilter({ maxDeviation: val })}
                        size="xs"
                      />
                    </Box>
                  </Group>

                  <Group>
                    <Switch
                      size="xs"
                      label="只看命中"
                      checked={filter.hitOnly || false}
                      onChange={(e) => setReplayFilter({ hitOnly: e.currentTarget.checked })}
                    />
                    <Switch
                      size="xs"
                      label="只看关键回合"
                      checked={filter.keyMomentsOnly || false}
                      onChange={(e) =>
                        setReplayFilter({ keyMomentsOnly: e.currentTarget.checked })
                      }
                    />
                  </Group>
                </Stack>
              </Paper>

              <Paper p="sm" radius="md" withBorder>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={600}>
                    筛选结果
                  </Text>
                  <Badge color="teal" size="sm">
                    {filteredRounds.length} 次投掷
                  </Badge>
                </Group>
                {filteredRounds.length > 0 && (
                  <Text size="xs" c="dimmed">
                    命中率:{' '}
                    {((filteredRounds.filter((r) => r.hit).length / filteredRounds.length) * 100).toFixed(1)}%
                  </Text>
                )}
              </Paper>

              <ScrollArea h={200} type="hover">
                <Stack gap={4}>
                  {filteredRounds.map((round, idx) => {
                    const roundIndex = currentSession.rounds.indexOf(round);
                    return (
                      <Paper
                        key={idx}
                        p="xs"
                        bg={round.hit ? 'green.0' : 'gray.0'}
                        radius="sm"
                        withBorder={false}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setReplayRound(roundIndex)}
                      >
                        <Group justify="space-between">
                          <Group gap="xs">
                            <Badge
                              color={round.player === 1 ? 'blue' : 'grape'}
                              variant="light"
                              size="xs"
                            >
                              {round.player === 1 ? p1Name : p2Name}
                            </Badge>
                            <Text size="xs">
                              第{round.round}轮 · {round.params.launchAngle.toFixed(0)}° ·{' '}
                              {round.params.launchForce.toFixed(1)}力
                            </Text>
                          </Group>
                          <Group gap="xs">
                            <Text size="xs" c="dimmed">
                              {round.deviationDistance.toFixed(2)}m
                            </Text>
                            <Badge
                              color={round.hit ? 'green' : 'gray'}
                              size="xs"
                              variant="filled"
                            >
                              {round.hit ? '中' : 'miss'}
                            </Badge>
                          </Group>
                        </Group>
                      </Paper>
                    );
                  })}
                </Stack>
              </ScrollArea>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Card>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  highlight?: boolean;
}) {
  return (
    <Paper
      p="sm"
      bg={highlight ? `${color}.0` : 'gray.0'}
      radius="md"
      withBorder={highlight}
      style={{ borderColor: highlight ? `var(--mantine-color-${color}-3)` : undefined }}
    >
      <Group gap="xs" mb="xs">
        {icon}
        <Text size="xs" c="dimmed">
          {label}
        </Text>
      </Group>
      <Text size="xl" fw={700} c={color}>
        {value}
      </Text>
    </Paper>
  );
}

function DataList({ stats, color }: { stats: any; color: string }) {
  const items = [
    { label: '平均角度', value: `${stats.avgAngle}°` },
    { label: '平均力度', value: stats.avgForce },
    { label: '力度标准差', value: stats.forceStd },
    { label: '平均偏差', value: `${stats.avgDeviation}m` },
    { label: '命中率', value: `${stats.hitRate}%` },
    { label: '关键命中率', value: `${stats.clutchHitRate}%` },
    { label: '平均飞行时间', value: `${stats.avgFlightTime}s` },
    { label: '平均最高高度', value: `${stats.avgMaxHeight}m` },
  ];

  return (
    <SimpleGrid cols={2} spacing={4}>
      {items.map((item, i) => (
        <Box key={i}>
          <Text size="xs" c="dimmed">
            {item.label}
          </Text>
          <Text size="sm" fw={600} c={color}>
            {item.value}
          </Text>
        </Box>
      ))}
    </SimpleGrid>
  );
}

function AdvantageRow({
  label,
  advantage,
  player1Name,
  player2Name,
}: {
  label: string;
  advantage: 1 | 2 | 0;
  player1Name: string;
  player2Name: string;
}) {
  return (
    <Group justify="space-between">
      <Text size="xs">{label}</Text>
      {advantage === 0 ? (
        <Text size="xs" c="dimmed">
          势均力敌
        </Text>
      ) : (
        <Text size="xs" fw={500} c={advantage === 1 ? 'blue' : 'grape'}>
          {advantage === 1 ? player1Name : player2Name} 占优
        </Text>
      )}
    </Group>
  );
}
