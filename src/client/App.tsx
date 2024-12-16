import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppShell, Loader, Center, Button, Stack, Text } from '@mantine/core'
import Schedule from './pages/Schedule'
import NextLecture from './pages/NextLecture'
import WeeklyView from './pages/WeeklyView'
import Navbar from './components/Navbar'
import { AuthProvider, useAuth } from './components/AuthProvider'
import { useEffect } from 'react'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, loginUrl } = useAuth()

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader size="xl" />
      </Center>
    )
  }

  if (!isAuthenticated) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="lg">
          <Text size="xl" fw={500}>Welcome to Campus Connect</Text>
          <Text c="dimmed" ta="center" maw={400}>
            Your personal assistant for managing lectures and train schedules at King's College London.
          </Text>
          <Button 
            component="a" 
            href={loginUrl}
            size="lg"
          >
            Login with Google
          </Button>
        </Stack>
      </Center>
    )
  }

  return <>{children}</>
}

function AppContent() {
  const location = useLocation()

  useEffect(() => {
    const titles = {
      '/': 'Schedule | Campus Connect',
      '/next': 'Next Lecture | Campus Connect',
      '/weekly': 'Weekly View | Campus Connect'
    }
    document.title = titles[location.pathname as keyof typeof titles] || 'Campus Connect'
  }, [location])

  return (
    <AppShell
      header={{ height: 70 }}
      padding="md"
    >
      <AppShell.Header p="md">
        <Navbar />
      </AppShell.Header>

      <AppShell.Main pt={85}>
        <Routes>
          <Route path="/" element={
            <ProtectedRoute>
              <Schedule />
            </ProtectedRoute>
          } />
          <Route path="/next" element={
            <ProtectedRoute>
              <NextLecture />
            </ProtectedRoute>
          } />
          <Route path="/weekly" element={
            <ProtectedRoute>
              <WeeklyView />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
} 