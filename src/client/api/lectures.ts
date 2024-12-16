import axios from 'axios'
import { Lecture } from '../types/api'
import { API_BASE_URL } from '../config'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
})

export async function fetchNextLecture(): Promise<Lecture> {
  const { data } = await api.get<Lecture>('/recommendations/next-lecture')
  return data
}

export async function fetchUpcomingLectures(count?: number): Promise<Lecture[]> {
  const { data } = await api.get<Lecture[]>('/recommendations/upcoming', {
    params: count ? { count } : undefined
  })
  return data
}

export async function fetchLecturesInRange(startDate: string, endDate: string): Promise<Lecture[]> {
  const { data } = await api.get<Lecture[]>('/recommendations/range', {
    params: { start: startDate, end: endDate }
  })
  return data
}

// Error handling middleware
api.interceptors.response.use(
  response => response,
  error => {
    const axiosError = error as unknown as { 
      response?: { 
        status: number
        data: unknown 
      }
    }

    if (axiosError.response) {
      const { status, data } = axiosError.response
      
      switch (status) {
        case 401:
          window.location.href = '/login'
          break
        case 403:
          console.error('Forbidden access:', data)
          break
        case 404:
          console.error('Resource not found:', data)
          break
        case 429:
          console.error('Rate limit exceeded:', data)
          break
        default:
          console.error('API error:', data)
      }
    } else {
      console.error('Error:', error)
    }
    return Promise.reject(error)
  }
) 