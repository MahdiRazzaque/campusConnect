import { Container, Title, Paper, Stack, Loader, Text, Badge, Group } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { fetchNextLecture } from '../api/lectures'
import { format, formatDistanceToNow, parse } from 'date-fns'

export default function NextLecture() {
  const { data: lecture, isLoading, error } = useQuery({
    queryKey: ['nextLecture'],
    queryFn: fetchNextLecture
  })

  if (isLoading) {
    return (
      <Container>
        <Loader size="xl" />
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <Title order={2} c="red">Error loading next lecture</Title>
        <Text c="red">{(error as Error).message}</Text>
      </Container>
    )
  }

  if (!lecture) {
    return (
      <Container>
        <Title order={2}>No upcoming lectures</Title>
      </Container>
    )
  }

  return (
    <Container size="md">
      <Stack gap="xl">
        <Title order={2} mt="md">Next Lecture</Title>
        <Paper p="xl" withBorder>
          <Stack gap="lg">
            <div>
              <Title order={3}>{lecture.event.summary}</Title>
              <Text c="dimmed" mt="xs">{lecture.event.location}</Text>
            </div>

            <Group gap="md">
              <Text fw={500}>
                {format(new Date(lecture.event.startTime), 'EEEE, MMMM d')}
              </Text>
              <Text>
                {format(new Date(lecture.event.startTime), 'h:mm a')} - 
                {format(new Date(lecture.event.endTime), 'h:mm a')}
              </Text>
              <Text c="dimmed" size="sm">
                ({formatDistanceToNow(new Date(lecture.event.startTime))} from now)
              </Text>
            </Group>

            <div>
              <Title order={4} size="h5" mb="md">Recommended Train</Title>
              {lecture.trains.length > 0 ? (
                lecture.trains.map((train, index) => {
                  // Parse the 24-hour time strings into Date objects
                  const today = new Date()
                  const departureTime = parse(train.scheduledDeparture, 'HHmm', today)
                  const arrivalTime = parse(train.scheduledArrival, 'HHmm', today)

                  return (
                    <Paper key={index} p="md" withBorder mb="sm">
                      <Group justify="space-between">
                        <div>
                          <Text fw={500}>
                            {format(departureTime, 'h:mm a')} →{' '}
                            {format(arrivalTime, 'h:mm a')}
                          </Text>
                          <Text size="sm" c="dimmed" mt={4}>Platform {train.platform}</Text>
                        </div>
                        <Badge 
                          color={train.isCancelled ? 'red' : 
                                 train.status === 'ON TIME' ? 'green' : 
                                 train.status === 'DELAYED' ? 'yellow' : 
                                 'blue'}
                        >
                          {train.status}
                        </Badge>
                      </Group>
                    </Paper>
                  )
                })
              ) : (
                <Text c="dimmed">No recommended trains available</Text>
              )}
            </div>

            {lecture.message && (
              <Text size="sm" c="dimmed">{lecture.message}</Text>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  )
} 