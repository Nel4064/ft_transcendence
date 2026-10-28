import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type User = {
  id: string
  username: string
  email: string
  avatarUrl?: string | null
  role: 'USER' | 'ADMIN'
  twoFactorEnabled?: boolean
}

type LoginResult =
  | User
  | {
      twoFactorRequired: boolean
      userId: string
    }

type AuthContextType = {
  user: User | null
  setUser: (user: User | null) => void 
  loading: boolean
  login: (identifier: string, password: string) => Promise<LoginResult>
  authenticate2fa: (code: string, userId: string) => Promise<User>
  logout: () => void
  apiFetch: (path: string, options?: RequestInit) => Promise<any>
}

const AuthContext = createContext<AuthContextType | null>(null)

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).replace(/\/+$/, '')

function normalizeApiPath(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`

  if (cleanPath === '/api' || cleanPath.startsWith('/api/')) {
    return cleanPath
  }

  return `/api${cleanPath}`
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<any> {
  const token = localStorage.getItem('token') || localStorage.getItem('jwt_token')
  const url = `${API_BASE_URL}${normalizeApiPath(path)}`

  const headers = new Headers(options.headers)

  if (options.body != null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  const text = await response.text()
  let data: any = null

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.message || `API request failed (${response.status})`,
    )
  }

  return data
}

function getAccessToken(data: any): string | null {
  const payload = data?.data ?? data

  return (
    payload?.access_token ??
    payload?.accessToken ??
    payload?.token ??
    payload?.access_token?.token ??
    null
  )
}

function getUser(data: any): User {
  return data?.user ?? data?.data?.user ?? data?.data ?? data
}

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function initializeAuth() {
      try {
        const params = new URLSearchParams(window.location.search)
        const urlToken = params.get('token')

        if (urlToken) {
          localStorage.setItem('token', urlToken)
          localStorage.setItem('jwt_token', urlToken)

          params.delete('token')
          const query = params.toString()

          window.history.replaceState(
            {},
            '',
            window.location.pathname +
              (query ? `?${query}` : '') +
              window.location.hash,
          )
        }

        const activeToken = localStorage.getItem('token') || localStorage.getItem('jwt_token')
        if (!activeToken) {
          return
        }

        const profile = await apiFetch('/users/me')

        if (!cancelled) {
          setUser(getUser(profile))
        }
      } catch (error) {
        localStorage.removeItem('token')
        localStorage.removeItem('jwt_token')

        if (!cancelled) {
          setUser(null)
          console.error('Failed to load current user:', error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void initializeAuth()

    return () => {
      cancelled = true
    }
  }, [])

  // 第一步：账号密码登录
  async function login(
    identifier: string,
    password: string,
  ): Promise<LoginResult> {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    })

    const payload = data?.data ?? data

    if (
      payload?.requiresTwoFactor === true ||
      payload?.twoFactorRequired === true ||
      payload?.requiresTwoFactor === 'true'
    ) {
      if (!payload.userId) {
        throw new Error('2FA response did not contain userId')
      }

      // 修复点：返回二阶验证状态时，必须同时提供 userId
      return {
        twoFactorRequired: true,
        userId: String(payload.userId),
      }
    }

    const accessToken = getAccessToken(payload)

    if (!accessToken) {
      console.error('Unexpected login response:', data)
      throw new Error('Login response did not contain an access token')
    }

    localStorage.setItem('token', accessToken)
    localStorage.setItem('jwt_token', accessToken)

    try {
      const profile = await apiFetch('/users/me')
      const userData = getUser(profile)

      setUser(userData)
      return userData
    } catch (error) {
      localStorage.removeItem('token')
      localStorage.removeItem('jwt_token')
      setUser(null)
      throw error
    }
  }

  // 第二步：提交 userId + code
  async function authenticate2fa(
    code: string,
    userId: string,
  ): Promise<User> {
    if (!userId) {
      throw new Error('Missing userId. Please log in again.')
    }

    const data = await apiFetch('/auth/2fa/authenticate', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        code,
      }),
    })

    const accessToken = getAccessToken(data)

    if (!accessToken) {
      console.error('Unexpected 2FA response:', data)
      throw new Error('2FA response did not contain an access token')
    }

    localStorage.setItem('token', accessToken)
    localStorage.setItem('jwt_token', accessToken)

    try {
      const profile = await apiFetch('/users/me')
      const userData = getUser(profile)

      setUser(userData)
      return userData
    } catch (error) {
      localStorage.removeItem('token')
      localStorage.removeItem('jwt_token')
      setUser(null)
      throw error
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('jwt_token')
    localStorage.removeItem('temp_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        authenticate2fa,
        logout,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
