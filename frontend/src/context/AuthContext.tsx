import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type User = { id: string, username: string, email: string, role: 'USER' | 'ADMIN' }

type AuthContextType = {
    user: User | null
    loading: boolean
    login: (identifier: string, password: string) => Promise<User>
    logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export async function apiFetch(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token')
    const res = await fetch(`/api${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'API request failed')
    return data
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // 1. Retour de l'OAuth 42 : le backend a mis le token dans l'URL (?token=...)
        const params = new URLSearchParams(window.location.search)
        const urlToken = params.get('token')
        if (urlToken) {
            localStorage.setItem('token', urlToken)
            // On retire le token de l'URL
            window.history.replaceState({}, '', window.location.pathname)
        }
        
        if (!localStorage.getItem('token')) {
            setLoading(false)
            return
        }

        // 2. Charger le profil utilisateur au démarrage
        apiFetch('/api/users/me')
            .then(data => setUser(data.user || data))
            .catch(() => localStorage.removeItem('token'))
            .finally(() => setLoading(false))
    }, [])

    async function login(identifier: string, password: string): Promise<User> {
        // ⚠️ apiFetch ajoute déjà /api, il ne faut PAS mettre /api ici !
        const data = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ identifier, password }),
        })
        
        // Stocker le token
        localStorage.setItem('token', data.access_token)

        // Récupérer le profil utilisateur
        const profile = await apiFetch('/api/users/me') // ou /users/me selon votre backend
        const userData = profile.user || profile
        setUser(userData)
        
        return userData as User
    }

    function logout() {
        localStorage.removeItem('token')
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}
