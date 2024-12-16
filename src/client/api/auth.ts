import axios from 'axios'
import { API_BASE_URL } from '../config'

const api = axios.create({
    baseURL: `${API_BASE_URL}/auth`,
    withCredentials: true
})

export interface AuthStatus {
    authenticated: boolean
    loginUrl?: string
}

export async function checkAuthStatus(): Promise<AuthStatus> {
    const { data } = await api.get<AuthStatus>('/status')
    return data
}

export async function logout(): Promise<void> {
    await api.get('/logout')
} 