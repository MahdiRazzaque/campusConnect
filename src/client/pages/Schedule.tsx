import { Container, Title, Paper, Stack, Text, Group, Badge, Center, Loader } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { fetchUpcomingLectures } from '../api/lectures'
import { format, formatDistanceToNow, parse } from 'date-fns'

export default function Schedule() {
  const { data: lectures, isLoading, error } = useQuery({
    queryKey: ['upcomingLectures'],
    queryFn: () => fetchUpcomingLectures(10)
  })

  if (isLoading) {
    return (
      <Center h="100%">
        <Loader size="xl" />
      </Center>
    )
  }

  if (error) {
    return (
      <Center h="100%">
        <Stack align="center">
          <Title order={2} c="red">Error Loading Schedule</Title>
          <Text c="red">Please try again later</Text>
        </Stack>
      </Center>
    )
  }

  if (!lectures?.length) {
    return (
      <Center h="100%">
        <Stack align="center">
          <Title order={2}>No Upcoming Lectures</Title>
          <Text c="dimmed">Check back later for updates</Text>
        </Stack>
      </Center>
    )
  }

  return (
    <Container size="100%">
      <Stack gap="xl">
        <Title order={2} mt="md">Upcoming Lectures</Title>
        
        {lectures.map((lecture, index) => {
          // Parse the train times if available
          const train = lecture.trains[0]
          const today = new Date()
          const departureTime = train ? parse(train.scheduledDeparture, 'HHmm', today) : null
          const arrivalTime = train ? parse(train.scheduledArrival, 'HHmm', today) : null

          return (
            <Paper key={index} p="xl" withBorder>
              <Stack gap="md">
                <Group justify="space-between" wrap="wrap" gap="sm">
                  <Stack gap="xs" style={{ flex: 1, minWidth: 200 }}>
                    <Title order={3} size="h4">{lecture.event.summary}</Title>
                    <Text c="dimmed" size="sm">{lecture.event.location}</Text>
                  </Stack>
                  <Badge size="lg">
                    {formatDistanceToNow(new Date(lecture.event.startTime))}
                  </Badge>
                </Group>

                <Group gap="md" wrap="wrap">
                  <Text fw={500}>
                    {format(new Date(lecture.event.startTime), 'EEEE, MMMM d')}
                  </Text>
                  <Text>
                    {format(new Date(lecture.event.startTime), 'h:mm a')} - 
                    {format(new Date(lecture.event.endTime), 'h:mm a')}
                  </Text>
                </Group>

                {lecture.trains.length > 0 && (
                  <Stack gap="sm">
                    <Text fw={500}>Recommended Train</Text>
                    <Paper p="md" withBorder>
                      <Group justify="space-between" wrap="wrap" gap="sm">
                        <Stack gap={4}>
                          <Text>
                            {format(departureTime!, 'h:mm a')} →{' '}
                            {format(arrivalTime!, 'h:mm a')}
                          </Text>
                          <Text size="sm" c="dimmed">Platform {train.platform}</Text>
                        </Stack>
                        <Badge 
                          color={train.isCancelled ? 'red' : 
                                 train.status === 'ON TIME' ? 'green' : 
                                 'yellow'}
                        >
                          {train.status}
                        </Badge>
                      </Group>
                    </Paper>
                  </Stack>
                )}
              </Stack>
            </Paper>
          )
        })}
      </Stack>
    </Container>
  )
} 