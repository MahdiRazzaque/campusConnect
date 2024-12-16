import { Group, Button, Title, Burger, Drawer, Stack, Container } from '@mantine/core'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { logout } from '../api/auth'
import { useState } from 'react'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, loginUrl, checkAuth } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path: string) => location.pathname === path

  const handleLogout = async () => {
    try {
      await logout()
      await checkAuth()
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const NavButtons = () => (
    <>
      <Button 
        variant={isActive('/') ? 'filled' : 'light'}
        onClick={() => {
          navigate('/')
          setMobileMenuOpen(false)
        }}
        fullWidth={mobileMenuOpen}
      >
        Schedule
      </Button>
      
      <Button 
        variant={isActive('/next') ? 'filled' : 'light'}
        onClick={() => {
          navigate('/next')
          setMobileMenuOpen(false)
        }}
        fullWidth={mobileMenuOpen}
      >
        Next Lecture
      </Button>
      
      <Button 
        variant={isActive('/weekly') ? 'filled' : 'light'}
        onClick={() => {
          navigate('/weekly')
          setMobileMenuOpen(false)
        }}
        fullWidth={mobileMenuOpen}
      >
        Weekly View
      </Button>

      <Button 
        variant="light"
        color="red"
        onClick={() => {
          handleLogout()
          setMobileMenuOpen(false)
        }}
        fullWidth={mobileMenuOpen}
      >
        Logout
      </Button>
    </>
  )

  return (
    <Container fluid h="100%">
      <Group h="100%" justify="space-between" wrap="nowrap">
        <Title order={3} style={{ whiteSpace: 'nowrap' }}>Campus Connect</Title>
        
        {isAuthenticated ? (
          <>
            {/* Desktop Navigation */}
            <Group gap="sm" visibleFrom="sm">
              <NavButtons />
            </Group>

            {/* Mobile Navigation */}
            <Burger
              hiddenFrom="sm"
              opened={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(o => !o)}
            />

            <Drawer
              opened={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
              title="Menu"
              position="right"
              size="xs"
              padding="md"
            >
              <Stack gap="sm">
                <NavButtons />
              </Stack>
            </Drawer>
          </>
        ) : (
          <Button 
            component="a"
            href={loginUrl}
          >
            Login with Google
          </Button>
        )}
      </Group>
    </Container>
  )
} 