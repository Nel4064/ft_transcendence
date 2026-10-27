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
	if (!res.ok) throw new Error(data.message)
	return data
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null)
	const [loading, setLoading] = useState(true)   // "je suis en train de vérifier"

	useEffect(() => 
	{
		// retour de l'OAuth 42 : le backend a mis le token dans l'URL (?token=...)
		const params = new URLSearchParams(window.location.search)
		const urlToken = params.get('token')
		if (urlToken) {
			localStorage.setItem('token', urlToken)
			// on retire le token de l'URL (historique, copier-coller, captures d'écran)
			window.history.replaceState({}, '', window.location.pathname)
	}
		
	if (!localStorage.getItem('token')) 
	{
		setLoading(false)
		return
	}
	apiFetch('/auth/profile')
		.then(data => setUser(data.user))
		.catch(() => localStorage.removeItem('token'))  // token périmé (au bout d'1h)
		.finally(() => setLoading(false))
	}, [])

	async function login(identifier: string, password: string) : Promise<User> {
		// 1. on envoie identifiant + mot de passe
		const data = await apiFetch('/auth/login', {
			method: 'POST',
			body: JSON.stringify({ identifier, password }),
		})
		// 2. on range le token
		localStorage.setItem('token', data.access_token)
		// 3. on demande au backend qui on est
		const profile = await apiFetch('/auth/profile')
		setUser(profile.user)
		// 4. on renvoie l'utilisateur pour que la page puisse lire son rôle
		return profile.user as User
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
