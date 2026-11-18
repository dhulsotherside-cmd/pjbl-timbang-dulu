import { useEffect, useState } from 'react'
import api from '../services/api'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('timbangdulu_token'))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const response = await api.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        setUser(response.data)
      } catch (error) {
        console.error('Gagal memuat profil pengguna:', error)
        localStorage.removeItem('timbangdulu_token')
        setToken(null)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [token])

  const login = async (username, password) => {
    const response = await api.post('/auth/login', {
      username,
      password,
    })

    const accessToken = response.data.access_token

    localStorage.setItem('timbangdulu_token', accessToken)
    setToken(accessToken)
    setUser(response.data.user)

    return response.data
  }

  const logout = () => {
    localStorage.removeItem('timbangdulu_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: Boolean(token && user),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}



