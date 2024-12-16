import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider, createTheme } from '@mantine/core'
import '@mantine/core/styles.css'
import App from './App'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: Infinity, // Don't mark data as stale automatically
      gcTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
      refetchInterval: (query) => {
        // Get the first lecture from the data if it exists
        const data = query.state.data
        if (!data) return false

        // For train data, if the lecture is today, refetch every minute
        const lectures = Array.isArray(data) ? data : [data]
        const today = new Date().toDateString()
        const hasLectureToday = lectures.some(lecture => 
          lecture?.event?.startTime && new Date(lecture.event.startTime).toDateString() === today
        )

        if (hasLectureToday) {
          return 60 * 1000 // 1 minute
        }

        // For calendar data, refetch at midnight UTC
        const now = new Date()
        const midnight = new Date()
        midnight.setUTCHours(24, 0, 0, 0)
        const timeUntilMidnight = midnight.getTime() - now.getTime()
        return timeUntilMidnight
      },
      // Keep previous data while fetching new data
      placeholderData: (previousData: unknown) => previousData
    },
  },
})

// Initialize cache from localStorage
const cachedData = localStorage.getItem('lectureCache')
if (cachedData) {
  try {
    const cache = JSON.parse(cachedData) as Record<string, unknown>
    Object.entries(cache).forEach(([queryKey, data]) => {
      queryClient.setQueryData(JSON.parse(queryKey), data)
    })
  } catch (error) {
    console.error('Error loading cache:', error)
    // Clear invalid cache
    localStorage.removeItem('lectureCache')
  }
}

// Save cache to localStorage when updated
queryClient.getQueryCache().subscribe(event => {
  if (event.type === 'updated') {
    const cache: Record<string, unknown> = {}
    queryClient.getQueryCache().getAll().forEach(query => {
      if (query.state.data !== undefined) {
        cache[JSON.stringify(query.queryKey)] = query.state.data
      }
    })
    localStorage.setItem('lectureCache', JSON.stringify(cache))
  }
})

// Create dark theme
const theme = createTheme({
  primaryColor: 'blue',
  primaryShade: 6,
  fontFamily: 'Inter, sans-serif',
  defaultRadius: 'md',
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5C5F66',
      '#373A40',
      '#2C2E33',
      '#25262B',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
  },
})

// Create root element
const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          <App />
        </MantineProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
) 