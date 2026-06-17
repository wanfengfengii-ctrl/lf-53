import { useState } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Box,
  Paper,
  Badge,
  Table,
  Stack,
  Tabs,
} from '@mantine/core';
import { IconTrophy, IconFlame, IconChartLine, IconClock, IconMedal } from '@tabler/icons-react';
import { getBattleHistory, getBattleLeaderboard } from '../utils/physics';
import type { BattleHistoryEntry, BattleLeaderboardEntry } from '../types/game';

export default function BattleLeaderboard() {
  const [leaderboard] = useState<BattleLeaderboardEntry[]>(() => getBattleLeaderboard());
  const [history] = useState<BattleHistoryEntry[]>(() => getBattleHistory());

  const medalColor = (rank: number) => {
    if (rank === 0) return '#fcc419';
    if (rank === 1) return '#868e96';
    if (rank === 2) return '#e8590c';
    return 'transparent';
  };

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Title order={3} mb="md">🏆 排行榜与历史战绩</Title>

      <Tabs defaultValue="leaderboard">
        <Tabs.List>
          <Tabs.Tab value="leaderboard" leftSection={<IconTrophy size={14} />}>
            排行榜
          </Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconClock size={14} />}>
            历史战绩
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="leaderboard" pt="md">
          {leaderboard.length === 0 ? (
            <Box
              style={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text c="dimmed">暂无排行数据，完成一局对战即可生成</Text>
            </Box>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>排名</Table.Th>
                  <Table.Th>玩家</Table.Th>
                  <Table.Th>胜</Table.Th>
                  <Table.Th>负</Table.Th>
                  <Table.Th>胜率</Table.Th>
                  <Table.Th>总得分</Table.Th>
                  <Table.Th>命中率</Table.Th>
                  <Table.Th>最长连中</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {leaderboard.map((entry, idx) => {
                  const total = entry.wins + entry.losses;
                  const winRate = total > 0 ? ((entry.wins / total) * 100).toFixed(0) : '0';
                  return (
                    <Table.Tr key={entry.playerName}>
                      <Table.Td>
                        {idx < 3 ? (
                          <Box
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: medalColor(idx),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: idx < 3 ? '#fff' : '#000',
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            {idx + 1}
                          </Box>
                        ) : (
                          <Text size="sm" fw={500}>{idx + 1}</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          {idx === 0 && <IconMedal size={14} color="#fcc419" />}
                          <Text size="sm" fw={600}>{entry.playerName}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={700} c="green">{entry.wins}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500} c="red">{entry.losses}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={Number(winRate) >= 50 ? 'green' : Number(winRate) >= 30 ? 'yellow' : 'red'}
                          variant="light"
                          size="sm"
                        >
                          {winRate}%
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{entry.totalScore}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <IconChartLine size={12} color="#228be6" />
                          <Text size="sm">{entry.avgHitRate}%</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <IconFlame size={12} color="#fd7e14" />
                          <Text size="sm">{entry.maxStreak}</Text>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="history" pt="md">
          {history.length === 0 ? (
            <Box
              style={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text c="dimmed">暂无历史战绩，完成一局对战即可记录</Text>
            </Box>
          ) : (
            <Stack gap="xs">
              {history.map((entry) => {
                const date = new Date(entry.date);
                const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
                const p1Won = entry.winner === 1;
                const p2Won = entry.winner === 2;
                return (
                  <Paper key={entry.id} p="sm" bg="gray.0" radius="md" withBorder>
                    <Group justify="space-between" align="center">
                      <Group gap="sm">
                        <Text size="sm" fw={600} c={p1Won ? 'green' : 'dimmed'}>
                          {entry.player1Name}
                        </Text>
                        <Badge
                          color={entry.winner === 0 ? 'yellow' : p1Won ? 'green' : 'red'}
                          variant="light"
                          size="sm"
                        >
                          {entry.player1Score}
                        </Badge>
                        <Text size="sm" c="dimmed">vs</Text>
                        <Badge
                          color={entry.winner === 0 ? 'yellow' : p2Won ? 'green' : 'red'}
                          variant="light"
                          size="sm"
                        >
                          {entry.player2Score}
                        </Badge>
                        <Text size="sm" fw={600} c={p2Won ? 'green' : 'dimmed'}>
                          {entry.player2Name}
                        </Text>
                      </Group>
                      <Group gap="sm">
                        <Badge
                          color={entry.mode === 'timed' ? 'orange' : 'blue'}
                          variant="outline"
                          size="xs"
                        >
                          {entry.mode === 'timed' ? '限时赛' : '回合赛'}
                        </Badge>
                        <Text size="xs" c="dimmed">{entry.rounds}轮</Text>
                        <Text size="xs" c="dimmed">{dateStr}</Text>
                      </Group>
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
}
