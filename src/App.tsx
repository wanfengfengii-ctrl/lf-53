import { AppShell, Box, Group, Title, Text, Burger, useMantineTheme, SimpleGrid } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import ThreeScene from './components/ThreeScene';
import ControlPanel from './components/ControlPanel';
import StatsCharts from './components/StatsCharts';
import HistoryList from './components/HistoryList';
import TrainingAnalysis from './components/TrainingAnalysis';
import BattlePanel from './components/BattlePanel';
import BattleAnalysis from './components/BattleAnalysis';
import BattleLeaderboard from './components/BattleLeaderboard';
import { GameProvider, useGame } from './context/GameContext';

function AppContent() {
  const [mobileOpened, { toggle }] = useDisclosure();
  const theme = useMantineTheme();
  const { state, exitSmartTraining, exitBattle, startBattle } = useGame();
  const { trainingAnalysis, battleAnalysis, mode, battleSession } = state;

  const showTrainingAnalysis = mode === 'smart-training' && trainingAnalysis !== null;
  const showBattleAnalysis = mode === 'battle' && battleAnalysis !== null && battleSession?.completed;
  const showBattleMode = mode === 'battle';

  const handlePlayAgain = () => {
    if (battleSession) {
      startBattle(battleSession.config);
    }
  };

  if (showBattleAnalysis) {
    return (
      <AppShell header={{ height: 60 }} padding="md">
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Burger opened={mobileOpened} onClick={toggle} hiddenFrom="sm" size="sm" />
              <Box>
                <Title order={3} c="orange">⚔️ 投壶对战</Title>
              </Box>
            </Group>
            <Text size="sm" c="dimmed" visibleFrom="sm">
              多人对战排位 · 结果分析
            </Text>
          </Group>
        </AppShell.Header>
        <AppShell.Main>
          <Box style={{ height: 'calc(100vh - 92px)', overflow: 'auto' }}>
            <BattleAnalysis analysis={battleAnalysis} onClose={exitBattle} onPlayAgain={handlePlayAgain} />
          </Box>
        </AppShell.Main>
      </AppShell>
    );
  }

  if (showTrainingAnalysis) {
    return (
      <AppShell header={{ height: 60 }} padding="md">
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Burger opened={mobileOpened} onClick={toggle} hiddenFrom="sm" size="sm" />
              <Box>
                <Title order={3} c="blue">🏺 投壶游戏模拟器</Title>
              </Box>
            </Group>
            <Text size="sm" c="dimmed" visibleFrom="sm">
              智能训练 · 分析报告
            </Text>
          </Group>
        </AppShell.Header>
        <AppShell.Main>
          <Box style={{ height: 'calc(100vh - 92px)', overflow: 'auto' }}>
            <TrainingAnalysis analysis={trainingAnalysis} onClose={exitSmartTraining} />
          </Box>
        </AppShell.Main>
      </AppShell>
    );
  }

  if (showBattleMode) {
    return (
      <AppShell header={{ height: 60 }} padding="md">
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Burger opened={mobileOpened} onClick={toggle} hiddenFrom="sm" size="sm" />
              <Box>
                <Title order={3} c="orange">⚔️ 投壶对战</Title>
              </Box>
            </Group>
            <Text size="sm" c="dimmed" visibleFrom="sm">
              多人对战排位 · 同屏轮流投壶
            </Text>
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
                }}
              >
                <ThreeScene />
              </Box>
              <Box style={{ height: 380, flexShrink: 0 }}>
                <BattleLeaderboard />
              </Box>
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
              <BattlePanel />
            </Box>
          </SimpleGrid>
        </AppShell.Main>
      </AppShell>
    );
  }

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={mobileOpened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Box>
              <Title order={3} c="blue">🏺 投壶游戏模拟器</Title>
            </Box>
          </Group>
          <Text size="sm" c="dimmed" visibleFrom="sm">
            探索不同角度、力度与距离对命中率的影响
          </Text>
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
              }}
            >
              <ThreeScene />
            </Box>
            <Box
              style={{
                height: 380,
                flexShrink: 0,
              }}
            >
              <StatsCharts />
            </Box>
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
            <ControlPanel />
            <Box style={{ flex: 1, minHeight: 0 }}>
              <HistoryList />
            </Box>
          </Box>
        </SimpleGrid>
      </AppShell.Main>
    </AppShell>
  );
}

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
