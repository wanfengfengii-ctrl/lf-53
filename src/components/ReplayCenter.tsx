import {
  AppShell,
  Box,
  Group,
  Title,
  Text,
  Burger,
  useMantineTheme,
  SimpleGrid,
  Button,
  Badge,
  Paper,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconArrowBack,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconMapPin,
  IconSettings,
} from '@tabler/icons-react';
import ThreeScene from './ThreeScene';
import ReplayTimeline from './ReplayTimeline';
import ReplayAnalysis from './ReplayAnalysis';
import { useGame } from '../context/GameContext';

interface Props {
  onClose: () => void;
}

export default function ReplayCenter({ onClose }: Props) {
  const [mobileOpened, { toggle }] = useDisclosure();
  const theme = useMantineTheme();
  const { state, exportReplayReport, setReplayTrajectoryMode, toggleHitMarkers } = useGame();
  const { replay } = state;
  const { currentSession, showTrajectories, showHitMarkers, summary } = replay;

  if (!currentSession) {
    return (
      <AppShell header={{ height: 60 }} padding="md">
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Burger opened={mobileOpened} onClick={toggle} hiddenFrom="sm" size="sm" />
              <Title order={3} c="teal">
                📽 观战复盘中心
              </Title>
            </Group>
            <Button variant="subtle" onClick={onClose} leftSection={<IconArrowBack size={16} />}>
              返回
            </Button>
          </Group>
        </AppShell.Header>
        <AppShell.Main>
          <Box style={{ height: 'calc(100vh - 92px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text c="dimmed">暂无复盘数据</Text>
          </Box>
        </AppShell.Main>
      </AppShell>
    );
  }

  const p1Name = currentSession.config.player1Name;
  const p2Name = currentSession.config.player2Name;

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={mobileOpened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Box>
              <Title order={3} c="teal">
                📽 观战复盘中心
              </Title>
            </Box>
          </Group>
          <Group gap="xs">
            <Text size="sm" c="dimmed" visibleFrom="sm">
              {p1Name} vs {p2Name}
            </Text>
            <Badge color={currentSession.winner === 1 ? 'blue' : currentSession.winner === 2 ? 'grape' : 'yellow'} variant="filled">
              {currentSession.winner === 1
                ? `${p1Name} 胜`
                : currentSession.winner === 2
                ? `${p2Name} 胜`
                : '平局'}
            </Badge>
            <Button
              variant="subtle"
              size="sm"
              onClick={onClose}
              leftSection={<IconArrowBack size={16} />}
            >
              返回
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <SimpleGrid
          cols={{ base: 1, lg: 3 }}
          spacing="md"
          style={{ height: 'calc(100vh - 92px)' }}
        >
          <Box
            style={{
              gridColumn: 'span 2',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.md,
            }}
          >
            <Box
              style={{
                flex: 1,
                minHeight: 0,
                borderRadius: theme.radius.md,
                overflow: 'hidden',
                border: `1px solid ${theme.colors.gray[2]}`,
                position: 'relative',
              }}
            >
              <ThreeScene />

              <Box
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  zIndex: 10,
                }}
              >
                <Tooltip label="轨迹显示模式">
                  <Button.Group orientation="vertical">
                    <Button
                      size="xs"
                      variant={showTrajectories === 'all' ? 'filled' : 'light'}
                      color="teal"
                      onClick={() => setReplayTrajectoryMode('all')}
                      leftSection={<IconEye size={12} />}
                    >
                      全部轨迹
                    </Button>
                    <Button
                      size="xs"
                      variant={showTrajectories === 'current' ? 'filled' : 'light'}
                      color="teal"
                      onClick={() => setReplayTrajectoryMode('current')}
                      leftSection={<IconSettings size={12} />}
                    >
                      当前轨迹
                    </Button>
                    <Button
                      size="xs"
                      variant={showTrajectories === 'none' ? 'filled' : 'light'}
                      color="teal"
                      onClick={() => setReplayTrajectoryMode('none')}
                      leftSection={<IconEyeOff size={12} />}
                    >
                      隐藏轨迹
                    </Button>
                  </Button.Group>
                </Tooltip>

                <Tooltip label={showHitMarkers ? '隐藏命中标记' : '显示命中标记'}>
                  <Button
                    size="xs"
                    variant={showHitMarkers ? 'filled' : 'light'}
                    color="green"
                    onClick={toggleHitMarkers}
                    leftSection={<IconMapPin size={12} />}
                  >
                    命中点
                  </Button>
                </Tooltip>
              </Box>

              <ScoreOverlay />
            </Box>

            <Box style={{ flexShrink: 0 }}>
              <ReplayTimeline />
            </Box>

            {summary && summary.keyHighlights.length > 0 && (
              <Paper p="sm" bg="teal.0" radius="md" withBorder={false}>
                <Text size="xs" fw={600} mb="xs" c="teal">
                  ✨ 本场亮点
                </Text>
                <Group gap="xs" wrap="wrap">
                  {summary.keyHighlights.slice(0, 3).map((highlight, i) => (
                    <Badge key={i} color="teal" variant="light" size="sm">
                      {highlight}
                    </Badge>
                  ))}
                </Group>
              </Paper>
            )}
          </Box>

          <Box
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.md,
              height: '100%',
              overflow: 'auto',
            }}
          >
            <ReplayAnalysis />

            <Button
              fullWidth
              color="teal"
              leftSection={<IconDownload size={16} />}
              onClick={exportReplayReport}
            >
              导出对战报告
            </Button>
          </Box>
        </SimpleGrid>
      </AppShell.Main>
    </AppShell>
  );
}

function ScoreOverlay() {
  const { state } = useGame();
  const { replay } = state;
  const { currentSession, analysis, currentRoundIndex } = replay;

  if (!currentSession || !analysis) return null;

  const currentRound = currentSession.rounds[currentRoundIndex];
  if (!currentRound) return null;

  const p1Score = analysis.scoreTimeline.find((s) => s.round === currentRound.round)?.player1Score || 0;
  const p2Score = analysis.scoreTimeline.find((s) => s.round === currentRound.round)?.player2Score || 0;

  return (
    <Box
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 10,
      }}
    >
      <Paper p="sm" shadow="sm" radius="md" withBorder>
        <Group gap="md">
          <Box ta="center">
            <Text size="xs" c="dimmed">
              {currentSession.config.player1Name}
            </Text>
            <Text size="xl" fw={700} c="blue">
              {p1Score}
            </Text>
          </Box>
          <Text size="lg" c="dimmed" fw={700}>
            :
          </Text>
          <Box ta="center">
            <Text size="xs" c="dimmed">
              {currentSession.config.player2Name}
            </Text>
            <Text size="xl" fw={700} c="grape">
              {p2Score}
            </Text>
          </Box>
        </Group>
        <Text size="xs" c="dimmed" ta="center" mt={4}>
          第 {currentRound.round} 轮
        </Text>
      </Paper>
    </Box>
  );
}
