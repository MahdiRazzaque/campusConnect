import { Container, Title, Paper, Grid, Text, Stack, Group, Button, HoverCard, Badge, Tooltip, ActionIcon } from '@mantine/core'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLecturesInRange } from '../api/lectures'
import { startOfWeek, endOfWeek, eachDayOfInterval, format, addWeeks, subWeeks, parse, differenceInDays } from 'date-fns'
import { useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconRefresh, IconTrain, IconTrash } from '@tabler/icons-react'
import { Lecture, Train } from '../types/api'

function TrainInfo({ train }: { train: Train }) {
  const today = new Date()
  const departureTime = parse(train.scheduledDeparture, 'HHmm', today)
  const arrivalTime = parse(train.scheduledArrival, 'HHmm', today)

  return (
    <Paper p="xs" withBorder mb="xs">
      <Group justify="space-between">
        <div>
          <Text size="sm">
            {format(departureTime, 'h:mm a')} → {format(arrivalTime, 'h:mm a')}
          </Text>
          <Text size="xs" c="dimmed">Platform {train.platform}</Text>
        </div>
        <Badge 
          color={train.isCancelled ? 'red' : 
                 train.status === 'ON TIME' ? 'green' : 
                 'yellow'}
        >
          {train.status}
        </Badge>
      </Group>
    </Paper>
  )
}

function LectureCard({ lecture }: { lecture: Lecture }) {
  return (
    <HoverCard width={300} shadow="md" openDelay={0} closeDelay={0} position="right">
      <HoverCard.Target>
        <Paper 
          p="md" 
          withBorder 
          style={{ cursor: 'pointer' }}
          mb="sm"
          onClick={(e) => {
            // For mobile: toggle hover card on click
            const target = e.currentTarget
            const wasOpen = target.getAttribute('data-hover-open') === 'true'
            target.setAttribute('data-hover-open', (!wasOpen).toString())
            
            // Trigger hover events manually
            if (!wasOpen) {
              target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
            } else {
              target.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
            }
          }}
        >
          <Stack gap="xs">
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Text size="sm" fw={500} style={{ flex: 1, wordBreak: 'break-word' }}>
                {lecture.event.summary}
              </Text>
              {lecture.trains.length > 0 && (
                <IconTrain size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
              )}
            </Group>
            <Text size="sm">
              {format(new Date(lecture.event.startTime), 'h:mm a')}
            </Text>
            <Text size="xs" c="dimmed" style={{ wordBreak: 'break-word' }}>
              {lecture.event.location}
            </Text>
          </Stack>
        </Paper>
      </HoverCard.Target>

      <HoverCard.Dropdown>
        <Stack>
          <div>
            <Text fw={500}>Recommended Trains</Text>
            <Text size="xs" c="dimmed" mb="sm">
              To {lecture.destinationStation} ({lecture.campus === 'bushHouse' ? 'Bush House' : 'Waterloo'})
            </Text>
          </div>

          {lecture.trains.length > 0 ? (
            lecture.trains.map((train, index) => (
              <TrainInfo key={index} train={train} />
            ))
          ) : (
            <Text size="sm" c="dimmed">No train recommendations available</Text>
          )}

          {lecture.message && (
            <Text size="xs" c="dimmed">{lecture.message}</Text>
          )}
        </Stack>
      </HoverCard.Dropdown>
    </HoverCard>
  )
}

export default function WeeklyView() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const queryClient = useQueryClient()
  
  const start = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const end = endOfWeek(currentWeek, { weekStartsOn: 1 })
  
  const { data: lectures, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['weeklyLectures', start, end],
    queryFn: () => fetchLecturesInRange(start.toISOString(), end.toISOString())
  })

  const days = eachDayOfInterval({ start, end })
  const daysFromNow = Math.abs(differenceInDays(new Date(), start))
  const isBeyond60Days = daysFromNow > 60
  const needsLoad = isBeyond60Days && !lectures

  const handlePreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1))
  }

  const handleNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1))
  }

  const handleCurrentWeek = () => {
    setCurrentWeek(new Date())
  }

  const handleRefresh = () => {
    refetch()
  }

  const handleClearCache = () => {
    // Clear React Query cache
    queryClient.clear()
    // Clear localStorage cache
    localStorage.removeItem('lectureCache')
    // Refetch current week's data
    refetch()
  }

  return (
    <Container size="100%">
      <Stack gap="xl">
        <Group justify="space-between" wrap="wrap" gap="md">
          <Group gap="md" align="center">
            <Title order={2}>Weekly Schedule</Title>
            <Tooltip 
              label={needsLoad ? "Load data for this week" : "Refresh data"}
              position="right"
            >
              <Button 
                variant="subtle" 
                color={needsLoad ? "blue" : "gray"}
                onClick={handleRefresh}
                loading={isRefetching}
                leftSection={<IconRefresh size={16} />}
              >
                {needsLoad ? "Load" : "Refresh"}
              </Button>
            </Tooltip>
          </Group>
          <Group gap="sm">
            <Button 
              variant="light"
              onClick={handlePreviousWeek}
              leftSection={<IconChevronLeft size={16} stroke={1.5} />}
            >
              Previous Week
            </Button>
            <Button 
              variant="filled"
              onClick={handleCurrentWeek}
            >
              Current Week
            </Button>
            <Button 
              variant="light"
              onClick={handleNextWeek}
              rightSection={<IconChevronRight size={16} stroke={1.5} />}
            >
              Next Week
            </Button>
            <Tooltip label="Clear cache">
              <ActionIcon 
                variant="light" 
                color="red" 
                onClick={handleClearCache}
                size="lg"
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Text c="dimmed">
          {format(start, 'MMMM d')} - {format(end, 'MMMM d, yyyy')}
          {needsLoad && (
            <Text span size="sm" ml="md" c="blue">
              (Beyond 60 days - click Load to fetch data)
            </Text>
          )}
        </Text>

        <Grid>
          {days.map((day, index) => (
            <Grid.Col key={index} span={12 / 7}>
              <Paper p="md" withBorder h="100%" style={{ minHeight: '300px' }}>
                <Stack gap="md">
                  <Group justify="space-between" wrap="nowrap">
                    <Text fw={500} size="lg" style={{ whiteSpace: 'nowrap' }}>
                      {format(day, 'EEE')}
                    </Text>
                    <Text size="md" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                      {format(day, 'MMM d')}
                    </Text>
                  </Group>
                  
                  {isLoading || isRefetching ? (
                    <Text size="sm">Loading...</Text>
                  ) : needsLoad ? (
                    <Text size="sm" c="dimmed" ta="center">Click Load to view lectures</Text>
                  ) : (
                    lectures
                      ?.filter(lecture => 
                        format(new Date(lecture.event.startTime), 'yyyy-MM-dd') === 
                        format(day, 'yyyy-MM-dd')
                      )
                      .map((lecture, lectureIndex) => (
                        <LectureCard key={lectureIndex} lecture={lecture} />
                      ))
                  )}
                </Stack>
              </Paper>
            </Grid.Col>
          ))}
        </Grid>
      </Stack>
    </Container>
  )
} 