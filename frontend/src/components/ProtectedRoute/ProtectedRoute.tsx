import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
	const { user, loading } = useAuth()

	if (loading)
		return null

	if (!user)
		return <Navigate to="/signin" replace />

	if (adminOnly && user.role !== 'ADMIN')
		return <Navigate to="/" replace />
	return <Outlet />
}

export default ProtectedRoute