import {
  Card,
  Title,
  Slider,
  NumberInput,
  Button,
  Group,
  SegmentedControl,
  Text,
  Badge,
  Divider,
  Stack,
  Paper,
  Box,
} from '@mantine/core';
import { IconTarget, IconPlayerPlay, IconRotate, IconChartLine } from '@tabler/icons-react';
import { useGame } from '../context/GameContext';
import { calculateHitRate } from '../utils/physics';

export default function ControlPanel() {
  const { state, setMode, setParams, performThrowAction, resetResults } = useGame();
  const { mode, params, results, isPlaying, bestAngleRange } = state;

  const hitRate = calculateHitRate(results);
  const lastResult = results.length > 0 ? results[results.length - 1] : null;

  const handleLaunchXChange = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (!isNaN(numValue)) {
      setParams({
        launchPosition: { ...params.launchPosition, x: numValue },
      });
    }
  };

  const handleLaunchZChange = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (!isNaN(numValue)) {
      setParams({
        launchPosition: { ...params.launchPosition, z: numValue },
      });
    }
  };

  const handleLaunchYChange = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (!isNaN(numValue) && numValue > 0) {
      setParams({
        launchPosition: { ...params.launchPosition, y: numValue },
      });
    }
  };

  const handlePotXChange = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (!isNaN(numValue)) {
      setParams({
        potPosition: { ...params.potPosition, x: numValue },
      });
    }
  };

  const handlePotZChange = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (!isNaN(numValue)) {
      setParams({
        potPosition: { ...params.potPosition, z: numValue },
      });
    }
  };

  const handlePotRadiusChange = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (!isNaN(numValue) && numValue > 0) {
      setParams({ potRadius: numValue });
    }
  };

  const handleAngleChange = (value: number) => {
    setParams({ launchAngle: value });
  };

  const handleForceChange = (value: number) => {
    if (value > 0) {
      setParams({ launchForce: value });
    }
  };

  const handleThrow = () => {
    performThrowAction();
  };

  const getDistance = () => {
    const dx = params.potPosition.x - params.launchPosition.x;
    const dz = params.potPosition.z - params.launchPosition.z;
    return Math.sqrt(dx * dx + dz * dz).toFixed(2);
  };

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={3}>投壶控制面板</Title>
          <Badge color={mode === 'free' ? 'blue' : 'green'} variant="light" size="lg">
            {mode === 'free' ? '自由实验' : '训练模式'}
          </Badge>
        </Group>

        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as 'free' | 'training')}
          data={[
            { label: '自由实验', value: 'free' },
            { label: '训练模式', value: 'training' },
          ]}
          fullWidth
        />

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
          <Group justify="space-between" mt="xs">
            <Text size="xs" c="dimmed">当前力度: {params.launchForce.toFixed(1)}</Text>
            <Text size="xs" c="dimmed">距离: {getDistance()}</Text>
          </Group>
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

        <Divider my="xs" />

        <Text fw={500} size="sm">投掷点位置</Text>
        <Group grow>
          <NumberInput
            label="X 坐标"
            value={params.launchPosition.x}
            onChange={handleLaunchXChange}
            size="sm"
            step={0.5}
            disabled={isPlaying}
          />
          <NumberInput
            label="Y 高度"
            value={params.launchPosition.y}
            onChange={handleLaunchYChange}
            size="sm"
            step={0.5}
            min={0.1}
            disabled={isPlaying}
          />
          <NumberInput
            label="Z 坐标"
            value={params.launchPosition.z}
            onChange={handleLaunchZChange}
            size="sm"
            step={0.5}
            disabled={isPlaying}
          />
        </Group>

        <Text fw={500} size="sm">壶口位置</Text>
        <Group grow>
          <NumberInput
            label="X 坐标"
            value={params.potPosition.x}
            onChange={handlePotXChange}
            size="sm"
            step={0.5}
            disabled={isPlaying}
          />
          <NumberInput
            label="Z 坐标"
            value={params.potPosition.z}
            onChange={handlePotZChange}
            size="sm"
            step={0.5}
            disabled={isPlaying}
          />
          <NumberInput
            label="壶口半径"
            value={params.potRadius}
            onChange={handlePotRadiusChange}
            size="sm"
            step={0.05}
            min={0.1}
            disabled={isPlaying}
          />
        </Group>

        <Divider my="xs" />

        {mode === 'free' && bestAngleRange && (
          <Paper p="sm" bg="blue.0" radius="md" withBorder={false}>
            <Group gap="xs">
              <IconTarget size={16} color="#228be6" />
              <Text size="sm" fw={500}>最佳角度区间</Text>
            </Group>
            <Text size="lg" fw={700} c="blue">
              {bestAngleRange.min.toFixed(0)}° - {bestAngleRange.max.toFixed(0)}°
            </Text>
          </Paper>
        )}

        {mode === 'training' && (
          <Paper p="sm" bg="grape.0" radius="md" withBorder={false}>
            <Group gap="xs">
              <IconChartLine size={16} color="#be4bdb" />
              <Text size="sm" fw={500}>训练提示</Text>
            </Group>
            <Text size="xs" c="dimmed" mt="xs">
              调整角度和力度，尝试让箭矢落入壶中！最佳答案不会直接显示。
            </Text>
          </Paper>
        )}

        {lastResult && (
          <Paper
            p="sm"
            bg={lastResult.hit ? 'green.0' : 'red.0'}
            radius="md"
            withBorder={false}
          >
            <Group justify="space-between" align="center">
              <Text size="sm" fw={500}>
                第 {results.length} 次结果
              </Text>
              <Badge color={lastResult.hit ? 'green' : 'red'} variant="filled" size="sm">
                {lastResult.hit ? '命中!' : '未命中'}
              </Badge>
            </Group>
            <Group justify="space-between" mt="xs">
              <Text size="xs">偏差: {lastResult.deviationDistance.toFixed(2)}m</Text>
              <Text size="xs">最高: {lastResult.maxHeight.toFixed(2)}m</Text>
            </Group>
          </Paper>
        )}

        <Group grow mt="md">
          <Button
            leftSection={<IconPlayerPlay size={16} />}
            color={lastResult?.hit ? 'green' : 'blue'}
            onClick={handleThrow}
            loading={isPlaying}
            disabled={isPlaying}
            size="md"
          >
            {isPlaying ? '飞行中...' : '投 掷'}
          </Button>
          <Button
            leftSection={<IconRotate size={16} />}
            variant="outline"
            color="gray"
            onClick={resetResults}
            disabled={isPlaying || results.length === 0}
            size="md"
          >
            重置记录
          </Button>
        </Group>

        <Box>
          <Group justify="space-between">
            <Text size="sm">总投掷次数</Text>
            <Text size="sm" fw={500}>{results.length}</Text>
          </Group>
          <Group justify="space-between" mt="xs">
            <Text size="sm">命中次数</Text>
            <Text size="sm" fw={500} c="green">
              {results.filter((r) => r.hit).length}
            </Text>
          </Group>
          <Group justify="space-between" mt="xs">
            <Text size="sm">命中率</Text>
            <Text size="sm" fw={700} c={hitRate > 0.5 ? 'green' : hitRate > 0.2 ? 'yellow' : 'red'}>
              {(hitRate * 100).toFixed(1)}%
            </Text>
          </Group>
        </Box>
      </Stack>
    </Card>
  );
}
