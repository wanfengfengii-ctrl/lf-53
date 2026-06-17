import { useEffect, useRef, useCallback } from 'react';
import {
  Group,
  Button,
  Slider,
  Text,
  Badge,
  Paper,
  Box,
  Stack,
  Tooltip,
} from '@mantine/core';
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconPlayerTrackPrev,
  IconPlayerTrackNext,
  IconGauge,
  IconFlame,
  IconTarget,
  IconArrowForwardUp,
  IconX,
} from '@tabler/icons-react';
import { useGame } from '../context/GameContext';
import type { ReplayRound } from '../types/game';

export default function ReplayTimeline() {
  const { state, nextReplayRound, prevReplayRound, toggleReplayPlay, setReplaySpeed, setReplayRound } = useGame();
  const { replay } = state;
  const { currentSession, currentRoundIndex, isPlaying, playbackSpeed } = replay;
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying && currentSession) {
      const interval = 2000 / playbackSpeed;
      intervalRef.current = window.setInterval(() => {
        if (currentRoundIndex < currentSession.rounds.length - 1) {
          nextReplayRound();
        } else {
          toggleReplayPlay();
        }
      }, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, currentRoundIndex, currentSession, nextReplayRound, toggleReplayPlay]);

  const handleSliderChange = useCallback((value: number) => {
    setReplayRound(value);
  }, [setReplayRound]);

  const getMomentIcon = (type?: string) => {
    switch (type) {
      case 'streak_bonus':
        return <IconFlame size={12} color="#fd7e14" />;
      case 'turning_point':
        return <IconArrowForwardUp size={12} color="#228be6" />;
      case 'clutch_hit':
        return <IconTarget size={12} color="#40c057" />;
      case 'big_miss':
        return <IconX size={12} color="#fa5252" />;
      default:
        return null;
    }
  };

  if (!currentSession) return null;

  const rounds = currentSession.rounds;
  const currentRound = rounds[currentRoundIndex];
  const totalRounds = rounds.length;

  const marks = rounds
    .filter((r) => r.isKeyMoment)
    .map((r) => {
      const index = rounds.indexOf(r);
      return {
        value: index,
        label: '',
        round: r,
      };
    });

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Badge color="teal" variant="filled" size="lg">
              观战复盘
            </Badge>
            <Text size="sm" fw={500}>
              第 {currentRoundIndex + 1} / {totalRounds} 次投掷
            </Text>
          </Group>
          <Group gap="xs">
            <Badge color={currentRound.player === 1 ? 'blue' : 'grape'} variant="light">
              {currentRound.player === 1
                ? currentSession.config.player1Name
                : currentSession.config.player2Name}
            </Badge>
            <Badge color={currentRound.hit ? 'green' : 'gray'} variant="filled">
              {currentRound.hit ? '命中' : '未中'}
            </Badge>
            <Text size="sm" fw={700}>
              +{currentRound.roundScore} 分
            </Text>
          </Group>
        </Group>

        {currentRound.isKeyMoment && (
          <Paper p="xs" bg="orange.0" radius="sm" withBorder={false}>
            <Group gap="xs">
              {getMomentIcon(currentRound.keyMomentType)}
              <Text size="xs" fw={500} c="orange">
                {currentRound.keyMomentDescription}
              </Text>
            </Group>
          </Paper>
        )}

        <Box px="md">
          <Slider
            value={currentRoundIndex}
            onChange={handleSliderChange}
            min={0}
            max={totalRounds - 1}
            step={1}
            label={null}
            size="lg"
            color="teal"
            marks={marks.map((m) => ({ value: m.value, label: '' }))}
            styles={{
              mark: {
                height: 12,
                width: 12,
                top: 3,
                borderWidth: 2,
                borderColor: '#fd7e14',
                backgroundColor: '#fff',
              },
            }}
          />
        </Box>

        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Tooltip label="跳到开头">
              <Button
                variant="subtle"
                size="sm"
                onClick={() => setReplayRound(0)}
                disabled={currentRoundIndex === 0}
              >
                <IconPlayerTrackPrev size={18} />
              </Button>
            </Tooltip>
            <Tooltip label="上一回合">
              <Button
                variant="subtle"
                size="sm"
                onClick={prevReplayRound}
                disabled={currentRoundIndex === 0}
              >
                <IconPlayerSkipBack size={18} />
              </Button>
            </Tooltip>
            <Button
              color="teal"
              size="md"
              onClick={toggleReplayPlay}
              leftSection={isPlaying ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} />}
            >
              {isPlaying ? '暂停' : '播放'}
            </Button>
            <Tooltip label="下一回合">
              <Button
                variant="subtle"
                size="sm"
                onClick={nextReplayRound}
                disabled={currentRoundIndex === totalRounds - 1}
              >
                <IconPlayerSkipForward size={18} />
              </Button>
            </Tooltip>
            <Tooltip label="跳到结尾">
              <Button
                variant="subtle"
                size="sm"
                onClick={() => setReplayRound(totalRounds - 1)}
                disabled={currentRoundIndex === totalRounds - 1}
              >
                <IconPlayerTrackNext size={18} />
              </Button>
            </Tooltip>
          </Group>

          <Group gap="xs">
            <IconGauge size={16} />
            <Text size="xs" c="dimmed">
              速度
            </Text>
            <Button.Group>
              <Button
                size="xs"
                variant={playbackSpeed === 0.5 ? 'filled' : 'outline'}
                color="teal"
                onClick={() => setReplaySpeed(0.5)}
              >
                0.5x
              </Button>
              <Button
                size="xs"
                variant={playbackSpeed === 1 ? 'filled' : 'outline'}
                color="teal"
                onClick={() => setReplaySpeed(1)}
              >
                1x
              </Button>
              <Button
                size="xs"
                variant={playbackSpeed === 2 ? 'filled' : 'outline'}
                color="teal"
                onClick={() => setReplaySpeed(2)}
              >
                2x
              </Button>
              <Button
                size="xs"
                variant={playbackSpeed === 4 ? 'filled' : 'outline'}
                color="teal"
                onClick={() => setReplaySpeed(4)}
              >
                4x
              </Button>
            </Button.Group>
          </Group>
        </Group>

        <Group gap="xs" mt={4}>
          <Text size="xs" c="dimmed">
            关键回合标记:
          </Text>
          <Group gap="md">
            <Group gap={4}>
              <IconFlame size={12} color="#fd7e14" />
              <Text size="xs" c="dimmed">
                连中加分
              </Text>
            </Group>
            <Group gap={4}>
              <IconArrowForwardUp size={12} color="#228be6" />
              <Text size="xs" c="dimmed">
                比分反超
              </Text>
            </Group>
            <Group gap={4}>
              <IconTarget size={12} color="#40c057" />
              <Text size="xs" c="dimmed">
                关键命中
              </Text>
            </Group>
            <Group gap={4}>
              <IconX size={12} color="#fa5252" />
              <Text size="xs" c="dimmed">
                失误终结
              </Text>
            </Group>
          </Group>
        </Group>

        <RoundDetails round={currentRound} playerName={
          currentRound.player === 1
            ? currentSession.config.player1Name
            : currentSession.config.player2Name
        } />
      </Stack>
    </Paper>
  );
}

function RoundDetails({ round, playerName }: { round: ReplayRound; playerName: string }) {
  return (
    <Paper p="sm" bg="gray.0" radius="sm" withBorder={false}>
      <Group justify="space-between" grow>
        <Box>
          <Text size="xs" c="dimmed" mb={2}>
            {playerName} · 投掷参数
          </Text>
          <Group gap="md">
            <div>
              <Text size="xs" c="dimmed">
                角度
              </Text>
              <Text size="sm" fw={600}>
                {round.params.launchAngle.toFixed(0)}°
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                力度
              </Text>
              <Text size="sm" fw={600}>
                {round.params.launchForce.toFixed(1)}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                偏差
              </Text>
              <Text size="sm" fw={600}>
                {round.deviationDistance.toFixed(2)}m
              </Text>
            </div>
          </Group>
        </Box>
        <Box>
          <Text size="xs" c="dimmed" mb={2}>
            飞行数据
          </Text>
          <Group gap="md">
            <div>
              <Text size="xs" c="dimmed">
                最高高度
              </Text>
              <Text size="sm" fw={600}>
                {round.maxHeight.toFixed(2)}m
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                飞行时间
              </Text>
              <Text size="sm" fw={600}>
                {round.flightTime.toFixed(2)}s
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                连中数
              </Text>
              <Text size="sm" fw={600}>
                {round.streakCount}
              </Text>
            </div>
          </Group>
        </Box>
      </Group>
    </Paper>
  );
}
