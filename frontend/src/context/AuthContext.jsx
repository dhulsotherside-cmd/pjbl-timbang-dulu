import { useEffect, useState } from 'react'
import api from '../services/api'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('timbangdulu_token'))
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('timbangdulu_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
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
        localStorage.setItem('timbangdulu_user', JSON.stringify(response.data))
      } catch (error) {
        console.error('Gagal memuat profil pengguna:', error)
        localStorage.removeItem('timbangdulu_token')
        localStorage.removeItem('timbangdulu_user')
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
    localStorage.setItem('timbangdulu_user', JSON.stringify(response.data.user))
    setToken(accessToken)
    setUser(response.data.user)

    return response.data
  }

  const logout = () => {
    localStorage.removeItem('timbangdulu_token')
    localStorage.removeItem('timbangdulu_user')
    setToken(null)
    setUser(null)
  }

  const updateUser = (updatedUser) => {
    setUser(updatedUser)
    localStorage.setItem('timbangdulu_user', JSON.stringify(updatedUser))
    try {
      localStorage.setItem('timbangdulu_account_profile', JSON.stringify(updatedUser))
    } catch {}
    window.dispatchEvent(new Event('timbangdulu-profile-updated'))
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
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
