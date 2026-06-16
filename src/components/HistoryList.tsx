import { Card, Title, Text, ScrollArea, Group, Badge, Box, Paper } from '@mantine/core';
import { IconTarget, IconX, IconCheck } from '@tabler/icons-react';
import { useGame } from '../context/GameContext';

export default function HistoryList() {
  const { state } = useGame();
  const { results, mode, bestAngleRange, trainingTarget, trainingCompleted } = state;

  const reversedResults = [...results].reverse();

  return (
    <Card shadow="sm" p="md" radius="md" withBorder style={{ height: '100%' }}>
      <Group justify="space-between" mb="md">
        <Title order={3}>投掷记录</Title>
        <Badge variant="light">
          共 {results.length} 次
        </Badge>
      </Group>

      {mode === 'free' && bestAngleRange && (
        <Paper mb="sm" p="xs" bg="blue.0" radius="sm" withBorder={false}>
          <Group gap="xs">
            <IconTarget size={14} color="#228be6" />
            <Text size="xs" fw={500}>全局最佳角度: {bestAngleRange.min.toFixed(0)}° - {bestAngleRange.max.toFixed(0)}°</Text>
          </Group>
        </Paper>
      )}

      {mode === 'training' && trainingTarget && (
        <Paper mb="sm" p="xs" bg="grape.0" radius="sm" withBorder={false}>
          <Group gap="xs">
            <IconTarget size={14} color="#be4bdb" />
            <Text size="xs" fw={500}>
              {trainingCompleted ? '训练已结束' : `目标: 命中 ${trainingTarget.requiredHits} 次 | 剩余 ${Math.max(0, trainingTarget.maxAttempts - results.length)} 次`}
            </Text>
          </Group>
        </Paper>
      )}

      {results.length === 0 ? (
        <Box
          style={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text c="dimmed" size="sm">暂无记录</Text>
        </Box>
      ) : (
        <ScrollArea h={400} type="hover">
          <Box style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reversedResults.map((result) => (
              <Paper
                key={result.id}
                p="xs"
                bg={result.hit ? 'green.0' : 'gray.0'}
                radius="sm"
                withBorder
                style={{ borderColor: result.hit ? 'var(--mantine-color-green-2)' : 'var(--mantine-color-gray-2)' }}
              >
                <Group justify="space-between" align="flex-start">
                  <Box>
                    <Group gap="xs">
                      {result.hit ? (
                        <IconCheck size={14} color="#40c057" />
                      ) : (
                        <IconX size={14} color="#fa5252" />
                      )}
                      <Text size="sm" fw={500}>第 {result.id} 次</Text>
                    </Group>
                    <Text size="xs" c="dimmed" mt="xs">
                      角度: {result.params.launchAngle.toFixed(0)}° | 力度: {result.params.launchForce.toFixed(1)}
                    </Text>
                    {result.bestAngleRangeAtTime && mode === 'free' && (
                      <Text size="xs" c="blue" mt={4}>
                        最佳区间: {result.bestAngleRangeAtTime.min.toFixed(0)}° - {result.bestAngleRangeAtTime.max.toFixed(0)}°
                      </Text>
                    )}
                  </Box>
                  <Box ta="right">
                    <Badge
                      color={result.hit ? 'green' : 'gray'}
                      variant="light"
                      size="sm"
                    >
                      {result.hit ? '命中' : '未中'}
                    </Badge>
                    <Text size="xs" c="dimmed" mt="xs">
                      偏差: {result.deviationDistance.toFixed(2)}m
                    </Text>
                  </Box>
                </Group>
              </Paper>
            ))}
          </Box>
        </ScrollArea>
      )}
    </Card>
  );
}
