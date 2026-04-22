import { useState } from 'react'
import { registerUser, loginUser, logoutUser } from '../services/api'

interface User {
  name: string
  email: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('basira_user')
    return saved ? JSON.parse(saved) : null
  })

  const login = async (email: string, password: string, name?: string) => {
    try {
      let data
      if (name) {
        // Register
        data = await registerUser(email, password, name)
      } else {
        // Login
        data = await loginUser(email, password)
      }
      const newUser = { name: data.full_name, email }
      setUser(newUser)
      localStorage.setItem('basira_user', JSON.stringify(newUser))
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const logout = () => {
    logoutUser()
    setUser(null)
    localStorage.removeItem('basira_user')
  }

  return { user, login, logout }
}