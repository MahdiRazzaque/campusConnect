import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { checkAuthStatus, AuthStatus } from '../api/auth'
import { Center, Loader } from '@mantine/core'

interface AuthContextType {
    isAuthenticated: boolean
    isLoading: boolean
    loginUrl?: string
    checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

interface AuthProviderProps {
    children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [authState, setAuthState] = useState<AuthStatus>({
        authenticated: false
    })
    const [isLoading, setIsLoading] = useState(true)

    const checkAuth = async () => {
        try {
            const status = await checkAuthStatus()
            setAuthState(status)
        } catch (error) {
            console.error('Error checking auth status:', error)
            setAuthState({ authenticated: false })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        checkAuth()
    }, [])

    if (isLoading) {
        return (
            <Center h="100vh">
                <Loader size="xl" />
            </Center>
        )
    }

    return (
        <AuthContext.Provider 
            value={{
                isAuthenticated: authState.authenticated,
                isLoading,
                loginUrl: authState.loginUrl,
                checkAuth
            }}
        >
            {children}
        </AuthContext.Provider>
    )
} 