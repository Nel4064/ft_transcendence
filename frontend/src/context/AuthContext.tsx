import { createContext, useContext, useState, type ReactNode } from 'react'

type User = { email: string, role: 'user' | 'admin' }
const ADMIN_EMAIL = 'admin@cineclub.com'
const ADMIN_PASSWORD = 'admin'

type AuthContextType = {
	user: User | null
	login: (email: string, password: string) => void
	logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(() => {
		const saved = localStorage.getItem('user')
		return saved ? JSON.parse(saved) : null
	})

	function login(email: string, password: string) {
		if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
			const u = { email, role: 'admin' as const }
			localStorage.setItem('user', JSON.stringify(u))
			setUser(u)
		} else {
			const u = { email, role: 'user' as const }
			localStorage.setItem('user', JSON.stringify(u))
			setUser(u)
		}
	}

	function logout() {
		localStorage.removeItem('user')
		setUser(null)
	}

	return (
		<AuthContext.Provider value={{ user, login, logout }}>
			{children}
		</AuthContext.Provider>
	)
}

export function useAuth() {
	const ctx = useContext(AuthContext)
	if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
	return ctx
}
