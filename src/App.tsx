import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('camai_token')
    if (token === 'authenticated') {
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('camai_token')
    setIsAuthenticated(false)
  }

  return isAuthenticated
    ? <Dashboard onLogout={handleLogout} />
    : <Login onLogin={handleLogin} />
}
