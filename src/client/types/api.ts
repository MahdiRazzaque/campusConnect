export interface Event {
  id: string
  summary: string
  location: string
  description?: string
  startTime: string
  endTime: string
  htmlLink?: string
}

export interface Train {
  serviceId: string
  operator: string
  platform: string
  scheduledDeparture: string
  scheduledArrival: string
  status: 'ON TIME' | 'DELAYED' | 'CANCELLED' | 'DEPARTED' | 'SCHEDULED'
  isCancelled: boolean
  delay: number
}

export interface Lecture {
  event: Event
  campus: 'bushHouse' | 'waterloo'
  destinationStation: string
  recommendedArrival: string
  trains: Train[]
  message?: string
}

export interface APIError {
  message: string
  status: number
  code?: string
} 