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
  Progress,
  RingProgress,
  Stepper,
} from '@mantine/core';
import {
  IconTarget,
  IconPlayerPlay,
  IconRotate,
  IconChartLine,
  IconTrophy,
  IconFlame,
  IconWind,
  IconArrowsMove,
  IconArrowUp,
  IconArrowDown,
  IconBrain,
  IconLogout,
  IconChevronRight,
  IconEyeOff,
  IconGauge,
} from '@tabler/icons-react';
import { useGame } from '../context/GameContext';
import { calculateHitRate, analyzeRecentPerformance } from '../utils/physics';
import type { TrainingDifficulty } from '../types/game';

export default function ControlPanel() {
  const {
    state,
    setMode,
    setParams,
    performThrowAction,
    resetResults,
    startTraining,
    startSmartTraining,
    nextSmartLevel,
    exitSmartTraining,
    updateHeatZone,
  } = useGame();
  const {
    mode,
    params,
    results,
    isPlaying,
    bestAngleRange,
    trainingTarget,
    trainingCompleted,
    trainingScore,
    disturbanceParams,
    smartTrainingSession,
    trainingAnalysis,
    heatZoneData,
  } = state;

  const hitRate = calculateHitRate(results);
  const lastResult = results.length > 0 ? results[results.length - 1] : null;
  const trainingHits = results.filter((r) => r.hit).length;
  const trainingAttempts = results.length;

  const isThrowDisabled =
    isPlaying ||
    (mode === 'training' && trainingCompleted) ||
    (mode === 'smart-training' && smartTrainingSession?.completed) ||
    (mode === 'smart-training' && trainingAnalysis !== null);

  const recentPerf = analyzeRecentPerformance(results, 10);

  let currentLevelHits = 0;
  let currentLevelAttempts = 0;
  let currentLevelTotalAttempts = 0;
  let currentLevelRequiredHits = 0;
  let levelPassed = false;
  let levelFailed = false;

  if (smartTrainingSession && !smartTrainingSession.completed) {
    const currentLevel = smartTrainingSession.levels[smartTrainingSession.currentLevelIndex];
    currentLevelRequiredHits = currentLevel.requiredHits;
    currentLevelTotalAttempts = currentLevel.maxAttempts;

    const prevLevelsTotalAttempts = smartTrainingSession.levels
      .slice(0, smartTrainingSession.currentLevelIndex)
      .reduce((s, l) => s + l.maxAttempts, 0);

    const currentLevelResults = smartTrainingSession.inTrainingResults.filter(
      (_, i) => i >= prevLevelsTotalAttempts
    );

    currentLevelAttempts = currentLevelResults.length;
    currentLevelHits = currentLevelResults.filter((r) => r.hit).length;
    levelPassed = currentLevelHits >= currentLevelRequiredHits;
    levelFailed =
      !levelPassed && currentLevelAttempts >= currentLevelTotalAttempts;
  }

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

  const handleDifficultySelect = (difficulty: TrainingDifficulty) => {
    startTraining(difficulty);
  };

  const getDistance = () => {
    const dx = params.potPosition.x - params.launchPosition.x;
    const dz = params.potPosition.z - params.launchPosition.z;
    return Math.sqrt(dx * dx + dz * dz).toFixed(2);
  };

  const modeLabel = (m: string) => {
    switch (m) {
      case 'free':
        return '自由实验';
      case 'training':
        return '训练模式';
      case 'smart-training':
        return '智能训练';
      default:
        return m;
    }
  };

  const DisturbanceInfo = () => {
    const hasAny =
      Math.abs(disturbanceParams.windForce) > 0.01 ||
      Math.abs(disturbanceParams.lateralOffset) > 0.01 ||
      Math.abs(disturbanceParams.potHeightOffset) > 0.01;

    if (!hasAny) return null;

    return (
      <Paper p="sm" bg="cyan.0" radius="md" withBorder={false}>
        <Group gap="xs" mb="xs">
          <IconWind size={16} color="#1098ad" />
          <Text size="sm" fw={500}>环境扰动</Text>
        </Group>
        <Stack gap={4}>
          {Math.abs(disturbanceParams.windForce) > 0.01 && (
            <Group justify="space-between">
              <Group gap="xs">
                <IconWind size={12} color="#1098ad" />
                <Text size="xs" c="dimmed">风力</Text>
              </Group>
              <Text size="xs" fw={500}>
                {disturbanceParams.windForce.toFixed(2)} @ {disturbanceParams.windAngle.toFixed(0)}°
              </Text>
            </Group>
          )}
          {Math.abs(disturbanceParams.lateralOffset) > 0.01 && (
            <Group justify="space-between">
              <Group gap="xs">
                <IconArrowsMove size={12} color="#7950f2" />
                <Text size="xs" c="dimmed">横向偏移</Text>
              </Group>
              <Text size="xs" fw={500}>
                {disturbanceParams.lateralOffset > 0 ? '+' : ''}
                {disturbanceParams.lateralOffset.toFixed(2)}m
              </Text>
            </Group>
          )}
          {Math.abs(disturbanceParams.potHeightOffset) > 0.01 && (
            <Group justify="space-between">
              <Group gap="xs">
                {disturbanceParams.potHeightOffset > 0 ? (
                  <IconArrowUp size={12} color="#20c997" />
                ) : (
                  <IconArrowDown size={12} color="#fa5252" />
                )}
                <Text size="xs" c="dimmed">壶口高度</Text>
              </Group>
              <Text size="xs" fw={500}>
                {disturbanceParams.potHeightOffset > 0 ? '+' : ''}
                {disturbanceParams.potHeightOffset.toFixed(2)}m
              </Text>
            </Group>
          )}
        </Stack>
      </Paper>
    );
  };

  const getSmartTrainingLevelProgress = () => {
    if (!smartTrainingSession) return 0;
    const current = smartTrainingSession.currentLevelIndex;
    const total = smartTrainingSession.levels.length;
    if (smartTrainingSession.completed) return 100;
    return Math.round(((current + (levelPassed ? 1 : 0)) / total) * 100);
  };

  return (
    <Card shadow="sm" p="md" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={3}>投壶控制面板</Title>
          <Badge
            color={
              mode === 'free'
                ? 'blue'
                : mode === 'training'
                ? 'green'
                : 'violet'
            }
            variant="light"
            size="lg"
          >
            {modeLabel(mode)}
          </Badge>
        </Group>

        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as 'free' | 'training' | 'smart-training')}
          data={[
            { label: '自由实验', value: 'free' },
            { label: '训练模式', value: 'training' },
            { label: '🧠 智能训练', value: 'smart-training' },
          ]}
          fullWidth
        />

        {mode === 'smart-training' && !smartTrainingSession && (
          <>
            <Divider my="xs" />
            <Paper p="sm" bg="violet.0" radius="md" withBorder={false}>
              <Group gap="xs" mb="xs">
                <IconBrain size={18} color="#7048e8" />
                <Text size="sm" fw={600}>智能训练挑战</Text>
              </Group>
              <Text size="xs" c="dimmed" mb="sm">
                系统将基于你最近的 10 次成绩，动态生成训练关卡。
                每关有风力、横向偏移、壶口高度等扰动。
                最佳角度已隐藏，请通过轨迹和热区自行探索！
              </Text>
              {results.length > 0 && (
                <Box mb="sm">
                  <Group justify="space-between" mb="xs">
                    <Text size="xs" c="dimmed">最近 10 次表现</Text>
                    <Text size="xs" fw={500}>
                      命中率 {(recentPerf.hitRate * 100).toFixed(0)}% · 平均偏差{' '}
                      {recentPerf.avgDeviation.toFixed(2)}m
                    </Text>
                  </Group>
                  <Progress
                    value={recentPerf.hitRate * 100}
                    color={
                      recentPerf.hitRate > 0.5
                        ? 'green'
                        : recentPerf.hitRate > 0.2
                        ? 'yellow'
                        : 'red'
                    }
                    size="xs"
                  />
                </Box>
              )}
              <Button
                fullWidth
                leftSection={<IconFlame size={16} />}
                color="violet"
                onClick={startSmartTraining}
                size="md"
              >
                开始智能训练挑战
              </Button>
            </Paper>
          </>
        )}

        {mode === 'smart-training' && smartTrainingSession && (
          <>
            <Divider my="xs" />

            <Stack gap="xs">
              <Group justify="space-between">
                <Group gap="xs">
                  <IconBrain size={16} color="#7048e8" />
                  <Text size="sm" fw={600}>智能训练关卡进度</Text>
                </Group>
                <Badge color="violet" variant="light" size="sm">
                  {smartTrainingSession.currentLevelIndex + 1} /{' '}
                  {smartTrainingSession.levels.length}
                </Badge>
              </Group>

              <Stepper
                active={
                  smartTrainingSession.completed
                    ? smartTrainingSession.levels.length
                    : smartTrainingSession.currentLevelIndex + (levelPassed ? 1 : 0)
                }
                size="sm"
                allowNextStepsSelect={false}
                iconPosition="left"
              >
                {smartTrainingSession.levels.map((level) => (
                  <Stepper.Step
                    key={level.id}
                    label={
                      <Text size="xs" fw={500}>
                        {level.name}
                      </Text>
                    }
                    description={
                      <Text size="xs" c="dimmed">
                        {level.difficulty === 'easy'
                          ? '简单'
                          : level.difficulty === 'medium'
                          ? '中等'
                          : '困难'}
                      </Text>
                    }
                    completedIcon={<IconTrophy size={14} />}
                  />
                ))}
              </Stepper>

              <Progress
                value={getSmartTrainingLevelProgress()}
                color="violet"
                size="sm"
              />
            </Stack>

            {!smartTrainingSession.completed && !trainingAnalysis && (
              <Paper p="sm" bg="violet.0" radius="md" withBorder={false}>
                <Group justify="space-between" align="flex-start">
                  <Box>
                    <Group gap="xs" mb="xs">
                      <IconTarget size={16} color="#7048e8" />
                      <Text size="sm" fw={600}>
                        第 {smartTrainingSession.currentLevelIndex + 1} 关：
                        {smartTrainingSession.levels[smartTrainingSession.currentLevelIndex].name}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {
                        smartTrainingSession.levels[smartTrainingSession.currentLevelIndex]
                          .description
                      }
                    </Text>
                    <Group justify="space-between" mt="xs">
                      <Text size="xs">
                        距离:{' '}
                        {
                          smartTrainingSession.levels[smartTrainingSession.currentLevelIndex]
                            .distance
                        }
                        m
                      </Text>
                      <Text size="xs">
                        壶口:{' '}
                        {smartTrainingSession.levels[
                          smartTrainingSession.currentLevelIndex
                        ].potRadius.toFixed(2)}
                        m
                      </Text>
                    </Group>
                  </Box>
                  <Badge
                    color={
                      smartTrainingSession.levels[smartTrainingSession.currentLevelIndex]
                        .difficulty === 'easy'
                        ? 'green'
                        : smartTrainingSession.levels[smartTrainingSession.currentLevelIndex]
                            .difficulty === 'medium'
                        ? 'yellow'
                        : 'red'
                    }
                    variant="light"
                  >
                    {smartTrainingSession.levels[smartTrainingSession.currentLevelIndex]
                      .difficulty === 'easy'
                      ? '简单'
                      : smartTrainingSession.levels[smartTrainingSession.currentLevelIndex]
                          .difficulty === 'medium'
                      ? '中等'
                      : '困难'}
                  </Badge>
                </Group>

                <Group justify="space-between" mt="sm">
                  <Text size="xs" fw={500}>
                    命中要求: {currentLevelHits}/{currentLevelRequiredHits}
                  </Text>
                  <Text size="xs" fw={500}>
                    剩余次数:{' '}
                    {Math.max(0, currentLevelTotalAttempts - currentLevelAttempts)}
                  </Text>
                </Group>
                <Progress
                  value={Math.min(
                    100,
                    (currentLevelHits / currentLevelRequiredHits) * 100
                  )}
                  color={currentLevelHits >= currentLevelRequiredHits ? 'green' : 'violet'}
                  size="sm"
                  mt="xs"
                />

                {smartTrainingSession.levels[smartTrainingSession.currentLevelIndex]
                  .hideBestAngle && (
                  <Group gap="xs" mt="xs">
                    <IconEyeOff size={12} color="#868e96" />
                    <Text size="xs" c="dimmed" fw={500}>
                      最佳角度区间已隐藏，通过轨迹和热区自行探索！
                    </Text>
                  </Group>
                )}

                {levelPassed && (
                  <Paper p="sm" mt="sm" bg="green.1" radius="sm" withBorder={false}>
                    <Group justify="space-between" align="center">
                      <Group gap="xs">
                        <IconTrophy size={18} color="#40c057" />
                        <Text size="sm" fw={600}>
                          恭喜通过第 {smartTrainingSession.currentLevelIndex + 1} 关！
                        </Text>
                      </Group>
                      {smartTrainingSession.currentLevelIndex <
                        smartTrainingSession.levels.length - 1 && (
                        <Button
                          size="sm"
                          color="green"
                          onClick={nextSmartLevel}
                          rightSection={<IconChevronRight size={14} />}
                        >
                          进入下一关
                        </Button>
                      )}
                    </Group>
                  </Paper>
                )}

                {levelFailed && (
                  <Paper p="sm" mt="sm" bg="red.1" radius="sm" withBorder={false}>
                    <Group gap="xs">
                      <IconRotate size={18} color="#fa5252" />
                      <Text size="sm" fw={600} c="red.7">
                        未达到命中要求。训练已终止，请查看分析报告。
                      </Text>
                    </Group>
                  </Paper>
                )}
              </Paper>
            )}

            {!smartTrainingSession.completed && !trainingAnalysis && (
              <DisturbanceInfo />
            )}

            {smartTrainingSession && !trainingAnalysis && (
              <Paper p="sm" bg="teal.0" radius="md" withBorder={false}>
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <IconGauge size={16} color="#0c8599" />
                    <Text size="sm" fw={500}>命中预测热区</Text>
                  </Group>
                  <Button
                    variant="subtle"
                    size="xs"
                    color="teal"
                    onClick={updateHeatZone}
                  >
                    刷新预测
                  </Button>
                </Group>
                <Stack gap={4}>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">推荐角度</Text>
                    <Text size="xs" fw={500}>
                      {heatZoneData?.optimalAngle.toFixed(0) ?? '—'}°
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">推荐力度</Text>
                    <Text size="xs" fw={500}>
                      {heatZoneData?.optimalForce.toFixed(1) ?? '—'}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">热区中心偏移</Text>
                    <Text size="xs" fw={500}>
                      {heatZoneData
                        ? `X:${(heatZoneData.center.x - params.potPosition.x).toFixed(2)}m Z:${(heatZoneData.center.z - params.potPosition.z).toFixed(2)}m`
                        : '—'}
                    </Text>
                  </Group>
                </Stack>
                <Text size="xs" c="dimmed" mt="xs">
                  热区图显示在3D场景中壶口周围，红色代表高命中率区域。
                </Text>
              </Paper>
            )}

            {lastResult && !smartTrainingSession.completed && !trainingAnalysis && (
              <Paper
                p="sm"
                bg={lastResult.hit ? 'green.0' : 'red.0'}
                radius="md"
                withBorder={false}
              >
                <Group justify="space-between" align="center">
                  <Text size="sm" fw={500}>
                    本关第 {currentLevelAttempts} 次结果
                  </Text>
                  <Badge
                    color={lastResult.hit ? 'green' : 'red'}
                    variant="filled"
                    size="sm"
                  >
                    {lastResult.hit ? '命中!' : '未命中'}
                  </Badge>
                </Group>
                <Group justify="space-between" mt="xs">
                  <Text size="xs">偏差: {lastResult.deviationDistance.toFixed(2)}m</Text>
                  <Text size="xs">最高: {lastResult.maxHeight.toFixed(2)}m</Text>
                </Group>
                {lastResult && !lastResult.hit && !smartTrainingSession.completed && (
                  <Text size="xs" mt="xs" c={lastResult.hit ? 'green' : 'red.7'}>
                    {lastResult.landPosition.x > params.potPosition.x ? '投过了' : '还不够远'}
                    ，偏差 {lastResult.deviationDistance.toFixed(2)}m，注意轨迹终点位置
                  </Text>
                )}
              </Paper>
            )}
          </>
        )}

        {mode === 'training' && !trainingTarget && (
          <>
            <Divider my="xs" />
            <Text fw={500} size="sm">选择训练难度</Text>
            <Stack gap="xs">
              <Button
                variant="outline"
                color="green"
                onClick={() => handleDifficultySelect('easy')}
                fullWidth
                leftSection={<IconFlame size={16} />}
              >
                <Group justify="space-between" w="100%" px="sm">
                  <Text size="sm">初级</Text>
                  <Text size="xs" c="dimmed">
                    近距离 · 大壶口 · 入门练习
                  </Text>
                </Group>
              </Button>
              <Button
                variant="outline"
                color="yellow"
                onClick={() => handleDifficultySelect('medium')}
                fullWidth
                leftSection={<IconFlame size={16} />}
              >
                <Group justify="space-between" w="100%" px="sm">
                  <Text size="sm">中级</Text>
                  <Text size="xs" c="dimmed">
                    中距离 · 标准壶口 · 技巧提升
                  </Text>
                </Group>
              </Button>
              <Button
                variant="outline"
                color="red"
                onClick={() => handleDifficultySelect('hard')}
                fullWidth
                leftSection={<IconFlame size={16} />}
              >
                <Group justify="space-between" w="100%" px="sm">
                  <Text size="sm">高级</Text>
                  <Text size="xs" c="dimmed">
                    远距离 · 小壶口 · 高手挑战
                  </Text>
                </Group>
              </Button>
            </Stack>
          </>
        )}

        {mode === 'training' && trainingTarget && (
          <>
            <Divider my="xs" />
            <Paper p="sm" bg="grape.0" radius="md" withBorder={false}>
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <IconTarget size={16} color="#be4bdb" />
                  <Text size="sm" fw={500}>训练目标</Text>
                </Group>
                <Badge
                  color={
                    trainingTarget.difficulty === 'easy'
                      ? 'green'
                      : trainingTarget.difficulty === 'medium'
                      ? 'yellow'
                      : 'red'
                  }
                  variant="light"
                  size="sm"
                >
                  {trainingTarget.difficulty === 'easy'
                    ? '初级'
                    : trainingTarget.difficulty === 'medium'
                    ? '中级'
                    : '高级'}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed" mt="xs">
                {trainingTarget.description}
              </Text>
              <Group justify="space-between" mt="xs">
                <Text size="xs">壶距: {trainingTarget.distance}m</Text>
                <Text size="xs">壶口半径: {trainingTarget.potRadius}m</Text>
              </Group>
              <Group justify="space-between" mt="xs">
                <Text size="xs" fw={500}>
                  命中要求: {trainingHits}/{trainingTarget.requiredHits}
                </Text>
                <Text size="xs" fw={500}>
                  剩余次数:{' '}
                  {Math.max(0, trainingTarget.maxAttempts - trainingAttempts)}
                </Text>
              </Group>
              <Progress
                value={Math.min(
                  100,
                  (trainingHits / trainingTarget.requiredHits) * 100
                )}
                color={trainingHits >= trainingTarget.requiredHits ? 'green' : 'grape'}
                size="sm"
                mt="xs"
              />
              {trainingCompleted && (
                <Paper
                  p="sm"
                  mt="sm"
                  bg={trainingScore > 0 ? 'green.1' : 'red.1'}
                  radius="sm"
                  withBorder={false}
                >
                  <Group justify="space-between" align="center">
                    <Group gap="xs">
                      <IconTrophy
                        size={18}
                        color={trainingScore > 0 ? '#40c057' : '#fa5252'}
                      />
                      <Text size="sm" fw={600}>
                        {trainingScore > 0 ? '训练完成！' : '训练失败'}
                      </Text>
                    </Group>
                    {trainingScore > 0 && (
                      <RingProgress
                        size={50}
                        thickness={5}
                        roundCaps
                        sections={[
                          { value: Math.min(trainingScore, 100), color: 'green' },
                        ]}
                        label={
                          <Text size="xs" fw={700} ta="center">
                            {trainingScore}
                          </Text>
                        }
                      />
                    )}
                  </Group>
                  <Text size="xs" c="dimmed" mt="xs">
                    {trainingScore > 0
                      ? `得分: ${trainingScore} 分 (命中 ${trainingHits}/${trainingAttempts} 次)`
                      : `未达到 ${trainingTarget.requiredHits} 次命中要求，已用完 ${trainingTarget.maxAttempts} 次机会`}
                  </Text>
                </Paper>
              )}
            </Paper>
            <Paper p="sm" bg="lime.0" radius="md" withBorder={false}>
              <Group gap="xs">
                <IconChartLine size={16} color="#82c91e" />
                <Text size="sm" fw={500}>训练提示</Text>
              </Group>
              <Text size="xs" c="dimmed" mt="xs">
                最佳答案不会直接显示，请通过观察轨迹和偏差来调整角度与力度。
              </Text>
              {lastResult && !trainingCompleted && (
                <Text
                  size="xs"
                  mt="xs"
                  c={lastResult.hit ? 'green' : 'red'}
                >
                  {lastResult.hit
                    ? '✓ 很好！保持这个方向！'
                    : `偏差 ${lastResult.deviationDistance.toFixed(2)}m，${
                        lastResult.landPosition.x > params.potPosition.x
                          ? '投过了'
                          : '还不够远'
                      }，请调整`}
                </Text>
              )}
            </Paper>
          </>
        )}

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
            disabled={isThrowDisabled}
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
            disabled={isThrowDisabled}
          />
          <Text size="xs" c="dimmed" mt="xs">
            当前角度: {params.launchAngle.toFixed(0)}°
          </Text>
        </Box>

        {mode === 'free' && (
          <>
            <Divider my="xs" />
            <Text fw={500} size="sm">投掷点位置</Text>
            <Group grow>
              <NumberInput
                label="X 坐标"
                value={params.launchPosition.x}
                onChange={handleLaunchXChange}
                size="sm"
                step={0.5}
                disabled={isThrowDisabled}
              />
              <NumberInput
                label="Y 高度"
                value={params.launchPosition.y}
                onChange={handleLaunchYChange}
                size="sm"
                step={0.5}
                min={0.1}
                disabled={isThrowDisabled}
              />
              <NumberInput
                label="Z 坐标"
                value={params.launchPosition.z}
                onChange={handleLaunchZChange}
                size="sm"
                step={0.5}
                disabled={isThrowDisabled}
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
                disabled={isThrowDisabled}
              />
              <NumberInput
                label="Z 坐标"
                value={params.potPosition.z}
                onChange={handlePotZChange}
                size="sm"
                step={0.5}
                disabled={isThrowDisabled}
              />
              <NumberInput
                label="壶口半径"
                value={params.potRadius}
                onChange={handlePotRadiusChange}
                size="sm"
                step={0.05}
                min={0.1}
                disabled={isThrowDisabled}
              />
            </Group>
          </>
        )}

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

        {lastResult &&
          (mode === 'free' || mode === 'training') &&
          !trainingCompleted && (
            <Paper
              p="sm"
              bg={lastResult.hit ? 'green.0' : 'red.0'}
              radius="md"
              withBorder={false}
            >
              <Group justify="space-between" align="center">
                <Text size="sm" fw={500}>第 {results.length} 次结果</Text>
                <Badge
                  color={lastResult.hit ? 'green' : 'red'}
                  variant="filled"
                  size="sm"
                >
                  {lastResult.hit ? '命中!' : '未命中'}
                </Badge>
              </Group>
              <Group justify="space-between" mt="xs">
                <Text size="xs">偏差: {lastResult.deviationDistance.toFixed(2)}m</Text>
                <Text size="xs">最高: {lastResult.maxHeight.toFixed(2)}m</Text>
              </Group>
              {lastResult.bestAngleRangeAtTime && mode === 'free' && (
                <Text size="xs" c="blue" mt="xs">
                  当前最佳区间:{' '}
                  {lastResult.bestAngleRangeAtTime.min.toFixed(0)}° -{' '}
                  {lastResult.bestAngleRangeAtTime.max.toFixed(0)}°
                </Text>
              )}
            </Paper>
          )}

        <Group grow mt="md">
          <Button
            leftSection={<IconPlayerPlay size={16} />}
            color={lastResult?.hit ? 'green' : 'blue'}
            onClick={handleThrow}
            loading={isPlaying}
            disabled={isThrowDisabled}
            size="md"
          >
            {isPlaying ? '飞行中...' : '投 掷'}
          </Button>
          {mode === 'smart-training' ? (
            <Button
              leftSection={<IconLogout size={16} />}
              variant="outline"
              color="gray"
              onClick={exitSmartTraining}
              size="md"
            >
              退出训练
            </Button>
          ) : (
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
          )}
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
            <Text
              size="sm"
              fw={700}
              c={hitRate > 0.5 ? 'green' : hitRate > 0.2 ? 'yellow' : 'red'}
            >
              {(hitRate * 100).toFixed(1)}%
            </Text>
          </Group>
        </Box>
      </Stack>
    </Card>
  );
}
