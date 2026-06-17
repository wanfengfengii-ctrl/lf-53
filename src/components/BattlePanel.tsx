import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Title,
  Slider,
  Button,
  Group,
  SegmentedControl,
  Text,
  Badge,
  Divider,
  Stack,
  Paper,
  Box,
  Progress,
  TextInput,
} from '@mantine/core';
import {
  IconSwords,
  IconPlayerPlay,
  IconClock,
  IconFlame,
  IconLogout,
  IconTarget,
} from '@tabler/icons-react';
import { useGame } from '../context/GameContext';
import type { BattleConfig, BattleMode } from '../types/game';
import { getDefaultDisturbance } from '../utils/physics';

export default function BattlePanel() {
  const { state, setParams, startBattle, performBattleThrow, battleTimedOut, exitBattle } = useGame();
  const { params, isPlaying, battleSession, battleAnalysis } = state;

  const [battleMode, setBattleMode] = useState<BattleMode>('rounds');
  const [rounds, setRounds] = useState(5);
  const [timeLimit, setTimeLimit] = useState(120);
  const [distance, setDistance] = useState(8);
  const [potRadius, setPotRadius] = useState(0.3);
  const [player1Name, setPlayer1Name] = useState('玩家1');
  const [player2Name, setPlayer2Name] = useState('玩家2');
  const [remainingTime, setRemainingTime] = useState(0);

  const setupMode = useMemo<'config' | 'playing' | 'result'>(() => {
    if (battleSession && !battleSession.completed) return 'playing';
    if (battleSession?.completed || battleAnalysis) return 'result';
    return 'config';
  }, [battleSession, battleAnalysis]);

  useEffect(() => {
    if (setupMode !== 'playing' || battleMode !== 'timed' || !battleSession || battleSession.completed) return;
    const endTime = battleSession.startTime + timeLimit * 1000;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      setRemainingTime(left);
      if (left <= 0) {
        clearInterval(interval);
        battleTimedOut();
      }
    }, 200);
    return () => clearInterval(interval);
  }, [setupMode, battleMode, battleSession, timeLimit, battleTimedOut]);

  const handleStartBattle = useCallback(() => {
    const config: BattleConfig = {
      mode: battleMode,
      rounds,
      timeLimitSeconds: timeLimit,
      distance,
      potRadius,
      disturbance: getDefaultDisturbance(),
      streakBonusThreshold: 3,
      streakBonusPoints: 5,
      player1Name: player1Name.trim() || '玩家1',
      player2Name: player2Name.trim() || '玩家2',
    };
    startBattle(config);
  }, [battleMode, rounds, timeLimit, distance, potRadius, player1Name, player2Name, startBattle]);

  const handleForceChange = (value: number) => {
    if (value > 0) setParams({ launchForce: value });
  };

  const handleAngleChange = (value: number) => {
    setParams({ launchAngle: value });
  };

  const handleThrow = () => {
    performBattleThrow();
  };

  if (setupMode === 'config') {
    return (
      <Card shadow="sm" p="md" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Title order={3}>⚔️ 多人对战排位</Title>
            <Badge color="orange" variant="light" size="lg">对战模式</Badge>
          </Group>

          <Paper p="sm" bg="orange.0" radius="md" withBorder={false}>
            <Group gap="xs" mb="xs">
              <IconSwords size={16} color="#e8590c" />
              <Text size="sm" fw={600}>对战规则</Text>
            </Group>
            <Text size="xs" c="dimmed">
              两名玩家同屏轮流投壶，相同壶距与扰动条件，系统自动结算每回合命中、偏差与积分。
              连续命中{3}次及以上触发连中加分！
            </Text>
          </Paper>

          <Divider my="xs" />

          <Text fw={500} size="sm">对战模式</Text>
          <SegmentedControl
            value={battleMode}
            onChange={(val) => setBattleMode(val as BattleMode)}
            data={[
              { label: '⏱ 限时赛', value: 'timed' },
              { label: '🎯 固定回合赛', value: 'rounds' },
            ]}
            fullWidth
          />

          {battleMode === 'rounds' ? (
            <Box>
              <Text fw={500} size="sm" mb="xs">回合数</Text>
              <Slider
                value={rounds}
                onChange={setRounds}
                min={3}
                max={15}
                step={1}
                label={(v) => `${v} 回合`}
                marks={[
                  { value: 3, label: '3' },
                  { value: 8, label: '8' },
                  { value: 15, label: '15' },
                ]}
              />
            </Box>
          ) : (
            <Box>
              <Text fw={500} size="sm" mb="xs">限时 (秒)</Text>
              <Slider
                value={timeLimit}
                onChange={setTimeLimit}
                min={30}
                max={300}
                step={10}
                label={(v) => `${v}s`}
                marks={[
                  { value: 30, label: '30s' },
                  { value: 120, label: '120s' },
                  { value: 300, label: '300s' },
                ]}
              />
            </Box>
          )}

          <Box>
            <Text fw={500} size="sm" mb="xs">壶距</Text>
            <Slider
              value={distance}
              onChange={setDistance}
              min={4}
              max={15}
              step={0.5}
              label={(v) => `${v}m`}
              marks={[
                { value: 5, label: '5m' },
                { value: 10, label: '10m' },
                { value: 15, label: '15m' },
              ]}
            />
          </Box>

          <Box>
            <Text fw={500} size="sm" mb="xs">壶口半径</Text>
            <Slider
              value={potRadius}
              onChange={setPotRadius}
              min={0.15}
              max={0.6}
              step={0.05}
              label={(v) => `${v.toFixed(2)}m`}
            />
          </Box>

          <Divider my="xs" />

          <Text fw={500} size="sm">玩家名称</Text>
          <Group grow>
            <TextInput
              label="玩家 1"
              value={player1Name}
              onChange={(e) => setPlayer1Name(e.currentTarget.value)}
              placeholder="玩家1"
            />
            <TextInput
              label="玩家 2"
              value={player2Name}
              onChange={(e) => setPlayer2Name(e.currentTarget.value)}
              placeholder="玩家2"
            />
          </Group>

          <Button
            fullWidth
            size="lg"
            color="orange"
            leftSection={<IconSwords size={20} />}
            onClick={handleStartBattle}
          >
            开始对战
          </Button>
        </Stack>
      </Card>
    );
  }

  if (setupMode === 'playing' && battleSession && !battleSession.completed) {
    const currentPlayerName = battleSession.currentPlayer === 1
      ? battleSession.config.player1Name
      : battleSession.config.player2Name;
    const currentStreak = battleSession.currentPlayer === 1
      ? battleSession.player1Streak
      : battleSession.player2Streak;
    const hasStreak = currentStreak >= battleSession.config.streakBonusThreshold;

    return (
      <Card shadow="sm" p="md" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Title order={3}>⚔️ 对战中</Title>
            <Badge color="orange" variant="filled" size="lg">
              {battleMode === 'timed' ? `第 ${battleSession.currentRound} 轮` : `第 ${battleSession.currentRound} / ${battleSession.config.rounds} 轮`}
            </Badge>
          </Group>

          {battleMode === 'timed' && (
            <Paper p="sm" bg={remainingTime <= 10 ? 'red.0' : 'orange.0'} radius="md" withBorder={false}>
              <Group justify="space-between">
                <Group gap="xs">
                  <IconClock size={16} color={remainingTime <= 10 ? '#fa5252' : '#e8590c'} />
                  <Text size="sm" fw={500}>剩余时间</Text>
                </Group>
                <Text size="xl" fw={700} c={remainingTime <= 10 ? 'red' : 'orange'}>
                  {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
                </Text>
              </Group>
              <Progress
                value={(remainingTime / timeLimit) * 100}
                color={remainingTime <= 10 ? 'red' : 'orange'}
                size="sm"
                mt="xs"
              />
            </Paper>
          )}

          <Paper
            p="sm"
            bg={battleSession.currentPlayer === 1 ? 'blue.0' : 'grape.0'}
            radius="md"
            withBorder={false}
          >
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <IconTarget size={18} color={battleSession.currentPlayer === 1 ? '#228be6' : '#be4bdb'} />
                <Text size="lg" fw={700}>
                  {currentPlayerName} 投掷
                </Text>
              </Group>
              {hasStreak && (
                <Badge color="orange" variant="filled" size="lg" leftSection={<IconFlame size={14} />}>
                  连中 ×{currentStreak}
                </Badge>
              )}
            </Group>
          </Paper>

          <Group grow>
            <Paper p="sm" bg="blue.0" radius="md" withBorder={false} ta="center">
              <Text size="xs" c="dimmed">{battleSession.config.player1Name}</Text>
              <Text size="xl" fw={700} c="blue">{battleSession.player1Score}</Text>
              <Text size="xs" c="dimmed">
                命中 {battleSession.player1Hits} · 连中 {battleSession.player1Streak}
              </Text>
            </Paper>
            <Paper p="sm" bg="grape.0" radius="md" withBorder={false} ta="center">
              <Text size="xs" c="dimmed">{battleSession.config.player2Name}</Text>
              <Text size="xl" fw={700} c="grape">{battleSession.player2Score}</Text>
              <Text size="xs" c="dimmed">
                命中 {battleSession.player2Hits} · 连中 {battleSession.player2Streak}
              </Text>
            </Paper>
          </Group>

          <Divider my="xs" />

          <Box>
            <Text fw={500} size="sm" mb="xs">投掷力度</Text>
            <Slider
              value={params.launchForce}
              onChange={handleForceChange}
              min={1}
              max={30}
              step={0.5}
              label={null}
              marks={[
                { value: 5, label: '5' },
                { value: 15, label: '15' },
                { value: 25, label: '25' },
              ]}
              disabled={isPlaying}
            />
            <Text size="xs" c="dimmed" mt="xs">当前力度: {params.launchForce.toFixed(1)}</Text>
          </Box>

          <Box>
            <Text fw={500} size="sm" mb="xs">投掷角度 (0-90°)</Text>
            <Slider
              value={params.launchAngle}
              onChange={handleAngleChange}
              min={0}
              max={90}
              step={1}
              label={null}
              marks={[
                { value: 0, label: '0°' },
                { value: 45, label: '45°' },
                { value: 90, label: '90°' },
              ]}
              disabled={isPlaying}
            />
            <Text size="xs" c="dimmed" mt="xs">当前角度: {params.launchAngle.toFixed(0)}°</Text>
          </Box>

          <Group grow>
            <Button
              leftSection={<IconPlayerPlay size={16} />}
              color="orange"
              onClick={handleThrow}
              loading={isPlaying}
              disabled={isPlaying}
              size="lg"
            >
              {isPlaying ? '飞行中...' : '投 掷'}
            </Button>
            <Button
              leftSection={<IconLogout size={16} />}
              variant="outline"
              color="gray"
              onClick={exitBattle}
              size="lg"
            >
              退出对战
            </Button>
          </Group>

          {battleSession.rounds.length > 0 && (
            <Paper p="xs" bg="gray.0" radius="md" withBorder={false}>
              <Text size="xs" fw={500} mb="xs">最近回合</Text>
              <ScrollArea h={120}>
                <Stack gap={4}>
                  {[...battleSession.rounds].reverse().slice(0, 6).map((r, i) => (
                    <Group key={i} justify="space-between">
                      <Group gap="xs">
                        <Badge
                          color={r.player === 1 ? 'blue' : 'grape'}
                          variant="light"
                          size="xs"
                        >
                          {r.player === 1 ? battleSession.config.player1Name : battleSession.config.player2Name}
                        </Badge>
                        <Text size="xs">第{r.round}轮</Text>
                      </Group>
                      <Group gap="xs">
                        <Badge color={r.hit ? 'green' : 'red'} variant="filled" size="xs">
                          {r.hit ? '命中' : '未中'}
                        </Badge>
                        <Text size="xs" c="dimmed">{r.deviationDistance.toFixed(2)}m</Text>
                        <Text size="xs" fw={500}>+{r.roundScore}</Text>
                        {r.streakCount >= battleSession.config.streakBonusThreshold && (
                          <IconFlame size={12} color="#fd7e14" />
                        )}
                      </Group>
                    </Group>
                  ))}
                </Stack>
              </ScrollArea>
            </Paper>
          )}
        </Stack>
      </Card>
    );
  }

  return null;
}

function ScrollArea({ h, children }: { h: number; children: React.ReactNode }) {
  return (
    <Box style={{ height: h, overflowY: 'auto' }}>
      {children}
    </Box>
  );
}
