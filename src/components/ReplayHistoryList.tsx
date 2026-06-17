import { useState, useEffect } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Badge,
  Paper,
  Box,
  ScrollArea,
  Button,
  Stack,
  Divider,
  ActionIcon,
  Tooltip,
  Modal,
} from '@mantine/core';
import {
  IconHistory,
  IconPlayerPlay,
  IconTrash,
  IconTrophy,
  IconClock,
  IconTarget,
  IconFlame,
  IconDownload,
} from '@tabler/icons-react';
import {
  getReplaySessions,
  deleteReplaySession,
  downloadReplayReport,
  analyzeReplaySession,
  generateReplaySummary,
} from '../utils/physics';
import type { ReplaySession } from '../types/game';

interface Props {
  onSelectReplay: (session: ReplaySession) => void;
}

export default function ReplayHistoryList({ onSelectReplay }: Props) {
  const [sessions, setSessions] = useState<ReplaySession[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const loadSessions = () => {
    const data = getReplaySessions();
    setSessions(data);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleDelete = (id: number) => {
    deleteReplaySession(id);
    loadSessions();
    setConfirmDelete(null);
  };

  const handleExport = (session: ReplaySession) => {
    const analysis = analyzeReplaySession(session);
    const summary = generateReplaySummary(session, analysis);
    downloadReplayReport(session, analysis, summary);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
  };

  return (
    <Card shadow="sm" p="md" radius="md" withBorder style={{ height: '100%' }}>
      <Stack gap="md" style={{ height: '100%' }}>
        <Group justify="space-between">
          <Group>
            <Title order={3}>📽 复盘历史</Title>
            <Badge variant="light" color="teal">
              {sessions.length} 场
            </Badge>
          </Group>
          <Button variant="subtle" size="sm" onClick={loadSessions}>
            刷新
          </Button>
        </Group>

        {sessions.length === 0 ? (
          <Box
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            <IconHistory size={48} color="#adb5bd" />
            <Text c="dimmed" size="sm">
              暂无复盘记录
            </Text>
            <Text c="dimmed" size="xs">
              完成对战后将自动保存复盘
            </Text>
          </Box>
        ) : (
          <ScrollArea type="hover" style={{ flex: 1, minHeight: 0 }}>
            <Stack gap="sm">
              {sessions.map((session) => (
                <ReplayCard
                  key={session.id}
                  session={session}
                  isSelected={selectedId === session.id}
                  onSelect={() => {
                    setSelectedId(session.id);
                    onSelectReplay(session);
                  }}
                  onDelete={() => setConfirmDelete(session.id)}
                  onExport={() => handleExport(session)}
                  formatDate={formatDate}
                  formatDuration={formatDuration}
                />
              ))}
            </Stack>
          </ScrollArea>
        )}
      </Stack>

      <Modal
        opened={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="确认删除"
        size="sm"
      >
        <Text size="sm" mb="md">
          确定要删除这场复盘记录吗？此操作不可恢复。
        </Text>
        <Group justify="flex-end">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>
            取消
          </Button>
          <Button color="red" onClick={() => confirmDelete && handleDelete(confirmDelete)}>
            删除
          </Button>
        </Group>
      </Modal>
    </Card>
  );
}

function ReplayCard({
  session,
  isSelected,
  onSelect,
  onDelete,
  onExport,
  formatDate,
  formatDuration,
}: {
  session: ReplaySession;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onExport: () => void;
  formatDate: (ts: number) => string;
  formatDuration: (sec: number) => string;
}) {
  const p1Color = session.winner === 1 ? '#40c057' : '#868e96';
  const p2Color = session.winner === 2 ? '#be4bdb' : '#868e96';

  return (
    <Paper
      p="sm"
      radius="md"
      withBorder
      style={{
        cursor: 'pointer',
        borderColor: isSelected ? 'var(--mantine-color-teal-5)' : undefined,
        boxShadow: isSelected ? '0 0 0 2px var(--mantine-color-teal-3)' : undefined,
        transition: 'all 0.2s',
      }}
      onClick={onSelect}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      <Stack gap="xs">
        <Group justify="space-between">
          <Group gap="xs">
            <IconTrophy size={14} color={session.winner === 0 ? '#fcc419' : '#fd7e14'} />
            <Text size="sm" fw={600}>
              {session.config.player1Name} vs {session.config.player2Name}
            </Text>
          </Group>
          <Badge
            color={session.winner === 1 ? 'blue' : session.winner === 2 ? 'grape' : 'yellow'}
            size="xs"
          >
            {session.winner === 1
              ? session.config.player1Name + '胜'
              : session.winner === 2
              ? session.config.player2Name + '胜'
              : '平局'}
          </Badge>
        </Group>

        <Group grow>
          <Box ta="center">
            <Text size="xs" c="dimmed">
              {session.config.player1Name}
            </Text>
            <Text size="lg" fw={700} style={{ color: p1Color }}>
              {session.player1Score}
            </Text>
          </Box>
          <Box ta="center">
            <Text size="xs" c="dimmed">
              比分
            </Text>
            <Text size="sm" c="dimmed">
              :
            </Text>
          </Box>
          <Box ta="center">
            <Text size="xs" c="dimmed">
              {session.config.player2Name}
            </Text>
            <Text size="lg" fw={700} style={{ color: p2Color }}>
              {session.player2Score}
            </Text>
          </Box>
        </Group>

        <Group gap="md" wrap="wrap">
          <Group gap={4}>
            <IconTarget size={12} color="#adb5bd" />
            <Text size="xs" c="dimmed">
              {session.totalRounds} 回合
            </Text>
          </Group>
          <Group gap={4}>
            <IconClock size={12} color="#adb5bd" />
            <Text size="xs" c="dimmed">
              {formatDuration(session.duration)}
            </Text>
          </Group>
          <Group gap={4}>
            <IconFlame size={12} color="#adb5bd" />
            <Text size="xs" c="dimmed">
              最高 {Math.max(session.player1MaxStreak, session.player2MaxStreak)} 连中
            </Text>
          </Group>
        </Group>

        <Divider my={4} />

        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {formatDate(session.startTime)}
          </Text>
          <Group gap={4} onClick={(e) => e.stopPropagation()}>
            <Tooltip label="导出报告">
              <ActionIcon size="sm" variant="subtle" color="teal" onClick={onExport}>
                <IconDownload size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="查看复盘">
              <ActionIcon size="sm" variant="subtle" color="green" onClick={onSelect}>
                <IconPlayerPlay size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="删除记录">
              <ActionIcon size="sm" variant="subtle" color="red" onClick={onDelete}>
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Stack>
    </Paper>
  );
}
