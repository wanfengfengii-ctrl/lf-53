import { AppShell, Box, Group, Title, Text, Burger, useMantineTheme, SimpleGrid } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import ThreeScene from './components/ThreeScene';
import ControlPanel from './components/ControlPanel';
import StatsCharts from './components/StatsCharts';
import HistoryList from './components/HistoryList';
import { GameProvider } from './context/GameContext';

function App() {
  const [mobileOpened, { toggle }] = useDisclosure();
  const theme = useMantineTheme();

  return (
    <GameProvider>
      <AppShell
        header={{ height: 60 }}
        padding="md"
      >
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
    </GameProvider>
  );
}

export default App;
